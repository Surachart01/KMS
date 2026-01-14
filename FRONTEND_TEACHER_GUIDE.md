# 🎯 Frontend Changes for Teacher Selection in Subjects

## ไฟล์: `/app/admin/subjects/page.jsx`

### **1. เพิ่ม State และ Fetch Teachers**

```jsx
const [teachers, setTeachers] = useState([]);

useEffect(() => {
    fetchSubjects();
    fetchTeachers(); // เพิ่มบรรทัดนี้
}, []);

const fetchTeachers = async () => {
    try {
        const response = await axios.get(`${API_URL}/users/teachers`);
        setTeachers(response.data.data || []);
    } catch (error) {
        console.error('Error fetching teachers:', error);
    }
};
```

---

### **2. แก้ไข Form - เพิ่ม Select Teachers**

```jsx
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
                {t.first_name} {t.last_name} {t.user_no && `(${t.user_no})`}
            </Select.Option>
        ))}
    </Select>
</Form.Item>
```

---

### **3. แก้ไข handleEdit - โหลด teacher_ids**

```jsx
const handleEdit = (record) => {
    setEditingSubject(record);
    form.setFieldsValue({
        subject_code: record.subject_code,
        subject_name: record.subject_name,
        teacher_ids: record.teachers?.map(t => t.user_id) || [] // เพิ่มบรรทัดนี้
    });
    setModalVisible(true);
};
```

---

### **4. เพิ่มคอลัมน์แสดงอาจารย์ในตาราง**

```jsx
// เพิ่ม import
import { Tag, Space } from 'antd';

// เพิ่มคอลัมน์ใหม่
const columns = [
    {
        title: 'รหัสวิชา',
        dataIndex: 'subject_code',
        key: 'subject_code',
    },
    {
        title: 'ชื่อวิชา',
        dataIndex: 'subject_name',
        key: 'subject_name',
    },
    {
        title: 'อาจารย์ผู้สอน',
        key: 'teachers',
        render: (_, record) => (
            <Space direction="vertical" size={0}>
                {record.teachers?.length > 0 ? (
                    record.teachers.map((teacher, idx) => (
                        <Tag key={idx} color="blue">
                            {teacher.first_name} {teacher.last_name}
                        </Tag>
                    ))
                ) : (
                    <span style={{ color: '#999' }}>-</span>
                )}
            </Space>
        ),
    },
    // ... คอลัมน์อื่นๆ
];
```

---

### **5. แก้ไข handleSubmit - ส่ง teacher_ids**

```jsx
const handleSubmit = async (values) => {
    try {
        const data = {
            subject_name: values.subject_name,
            teacher_ids: values.teacher_ids || [] // เพิ่มบรรทัดนี้
        };

        if (editingSubject) {
            await axios.put(`${API_URL}/subjects/${editingSubject.subject_code}`, data);
            message.success('แก้ไขรายวิชาสำเร็จ');
        } else {
            await axios.post(`${API_URL}/subjects`, {
                subject_code: values.subject_code,
                ...data
            });
            message.success('เพิ่มรายวิชาสำเร็จ');
        }
        
        setModalVisible(false);
        form.resetFields();
        fetchSubjects();
    } catch (error) {
        console.error('Error:', error);
        message.error(error.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
};
```

---

## ✅ สรุปการเปลี่ยนแปลง

### **ก่อน:**
- ❌ แสดงเฉพาะรหัสและชื่อวิชา
- ❌ ไม่มีข้อมูลอาจารย์ผู้สอน

### **หลัง:**
- ✅ เลือกอาจารย์ผู้สอนได้ (Multiple Selection)
- ✅ แสดงรายชื่ออาจารย์ในตาราง
- ✅ 1 วิชาสามารถมีหลายอาจารย์
- ✅ แก้ไขอาจารย์ผู้สอนได้

---

## 🎯 ตัวอย่าง UI

### **Form:**
```
รหัสวิชา:      [CS101        ]
ชื่อวิชา:       [Computer Sci  ]
อาจารย์ผู้สอน:  [Select Multiple ▼]
                ☑ สมชาย ใจดี (T001)
                ☑ สมหญิง รักเรียน (T002)
                ☐ สมศักดิ์ ขยัน (T003)
```

### **ตาราง:**
```
รหัสวิชา | ชื่อวิชา         | อาจารย์ผู้สอน
---------|-----------------|------------------
CS101    | Computer Sci    | [สมชาย ใจดี]
         |                 | [สมหญิง รักเรียน]
CS102    | Data Structure  | [สมศักดิ์ ขยัน]
```

---

**หมายเหตุ:** คุณต้องแก้ไขไฟล์ `/app/admin/subjects/page.jsx` ตามขั้นตอนข้างต้น
