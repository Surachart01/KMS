# 📚 Task: เพิ่มฟีเจอร์อาจารย์ผู้สอนในรายวิชา (Many-to-Many)

## 🎯 เป้าหมาย
ให้หน้าจัดการรายวิชาสามารถระบุอาจารย์ผู้สอนได้ และ 1 วิชาสามารถมีหลายอาจารย์ได้

---

## 📋 สิ่งที่ต้องทำ

### **1. Database Schema (Prisma)**

#### **ปัญหา:**
- `Subject` model ไม่มี relation กับ `User` (teacher)
- ไม่สามารถระบุอาจารย์ผู้สอนได้

#### **วิธีแก้:**
สร้าง **Many-to-Many relation** ระหว่าง Subject และ User (teacher)

```prisma
// ใน Subject model
model Subject {
  subject_code String @id
  subject_name String
  
  // เพิ่ม relation
  teachers     SubjectTeacher[]  // Many-to-many กับ User
  class_schedules ClassSchedule[]
}

// สร้าง junction table ใหม่
model SubjectTeacher {
  subject_code String
  teacher_id   String
  
  subject Subject @relation(fields: [subject_code], references: [subject_code], onDelete: Cascade)
  teacher User    @relation(fields: [teacher_id], references: [user_id], onDelete: Cascade)
  
  @@id([subject_code, teacher_id])
  @@index([teacher_id])
}

// ใน User model
model User {
  user_id String @id @default(uuid())
  // ... existing fields
  
  // เพิ่ม relation
  teaching_subjects SubjectTeacher[]  // อาจารย์สอนวิชาอะไรบ้าง
  
  borrow_transactions BorrowTransaction[]
  access_logs         AccessLog[]
}
```

**Migration:**
```bash
cd backend
npx prisma migrate dev --name add_subject_teachers
```

---

### **2. Backend API**

#### **2.1 แก้ไข GET `/api/subjects`**
```javascript
// controllers/subjects.js
export const getAllSubjects = async (req, res) => {
  const subjects = await prisma.subject.findMany({
    include: {
      teachers: {
        include: {
          teacher: {
            select: {
              user_id: true,
              user_no: true,
              first_name: true,
              last_name: true,
            }
          }
        }
      }
    }
  });
  
  // Transform data
  const formatted = subjects.map(s => ({
    ...s,
    teachers: s.teachers.map(st => st.teacher)
  }));
  
  res.json({ data: formatted });
};
```

#### **2.2 แก้ไข POST/PUT `/api/subjects`**
```javascript
export const createSubject = async (req, res) => {
  const { subject_code, subject_name, teacher_ids } = req.body;
  
  const subject = await prisma.subject.create({
    data: {
      subject_code,
      subject_name,
      teachers: {
        create: teacher_ids?.map(id => ({
          teacher_id: id
        })) || []
      }
    }
  });
  
  res.json({ data: subject });
};

export const updateSubject = async (req, res) => {
  const { subject_code } = req.params;
  const { subject_name, teacher_ids } = req.body;
  
  await prisma.subject.update({
    where: { subject_code },
    data: {
      subject_name,
      teachers: {
        // ลบทั้งหมดแล้วสร้างใหม่
        deleteMany: {},
        create: teacher_ids?.map(id => ({
          teacher_id: id
        })) || []
      }
    }
  });
  
  res.json({ message: 'อัปเดตสำเร็จ' });
};
```

#### **2.3 เพิ่ม API ดึงรายชื่ออาจารย์**
```javascript
// GET /api/users/teachers
export const getTeachers = async (req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    select: {
      user_id: true,
      user_no: true,
      first_name: true,
      last_name: true,
    },
    orderBy: { first_name: 'asc' }
  });
  
  res.json({ data: teachers });
};
```

---

### **3. Frontend UI**

#### **3.1 แก้ไข Form (subjects/page.jsx)**
```jsx
// เพิ่ม state
const [teachers, setTeachers] = useState([]);

// Fetch teachers
useEffect(() => {
  fetchTeachers();
}, []);

const fetchTeachers = async () => {
  const response = await usersAPI.getTeachers();
  setTeachers(response.data.data || []);
};

// ใน Modal Form
<Form.Item 
  name="teacher_ids" 
  label="อาจารย์ผู้สอน"
  tooltip="สามารถเลือกได้หลายคน"
>
  <Select
    mode="multiple"
    placeholder="เลือกอาจารย์ผู้สอน"
    allowClear
    showSearch
    filterOption={(input, option) =>
      option.children.toLowerCase().includes(input.toLowerCase())
    }
  >
    {teachers.map(t => (
      <Select.Option key={t.user_id} value={t.user_id}>
        {t.first_name} {t.last_name} ({t.user_no})
      </Select.Option>
    ))}
  </Select>
</Form.Item>
```

#### **3.2 แสดงในตาราง**
```jsx
{
  title: "อาจารย์ผู้สอน",
  key: "teachers",
  render: (_, record) => (
    <Space direction="vertical" size={0}>
      {record.teachers?.map((teacher, idx) => (
        <Tag key={idx} color="blue">
          {teacher.first_name} {teacher.last_name}
        </Tag>
      ))}
      {!record.teachers?.length && <Text type="secondary">-</Text>}
    </Space>
  )
}
```

---

## ✅ Checklist

### **Database:**
- [ ] เพิ่ม `SubjectTeacher` model
- [ ] เพิ่ม relation ใน `Subject`
- [ ] เพิ่ม relation ใน `User`
- [ ] Run migration

### **Backend:**
- [ ] แก้ไข GET subjects (include teachers)
- [ ] แก้ไข POST subjects (รับ teacher_ids)
- [ ] แก้ไข PUT subjects (update teachers)
- [ ] เพิ่ม GET /api/users/teachers

### **Frontend:**
- [ ] Fetch teachers list
- [ ] แก้ไข Form (Select multiple)
- [ ] แสดงอาจารย์ในตาราง
- [ ] Handle Edit (load existing teachers)

---

## 🎯 ผลลัพธ์ที่คาดหวัง

### **ก่อน:**
- ❌ ไม่สามารถระบุอาจารย์ผู้สอนได้
- ❌ ไม่รู้ว่าวิชาไหนใครสอน

### **หลัง:**
- ✅ เลือกอาจารย์ผู้สอนได้หลายคน
- ✅ แสดงรายชื่ออาจารย์ในตาราง
- ✅ 1 วิชาสามารถมีหลายอาจารย์
- ✅ 1 อาจารย์สามารถสอนหลายวิชา

---

**หมายเหตุ:** งานนี้ต้องทำทีละขั้นตอน เริ่มจาก Database → Backend → Frontend
