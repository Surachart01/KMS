# 📚 Student Excel Import System - Complete Documentation

## 🎯 ภาพรวม

ระบบ Import นักศึกษาจาก Excel ที่พร้อมใช้งานเต็มรูปแบบ รองรับการ validate ข้อมูลก่อนนำเข้า และแสดงผลลัพธ์แบบละเอียด

---

## 📁 ไฟล์ที่สร้าง

```
backend/
├── src/
│   ├── controllers/
│   │   └── studentImport.js          # Controller สำหรับ import
│   │
│   ├── services/
│   │   └── studentImportService.js   # Logic สำหรับ parse/validate
│   │
│   ├── utils/
│   │   └── excelTemplate.js          # สร้าง Excel template
│   │
│   ├── middleware/
│   │   └── uploadMiddleware.js       # Multer middleware
│   │
│   └── routes/
│       └── studentImport.js          # API routes
│
├── generate-template.js               # Script สร้าง template
└── student-import-template.xlsx       # ✅ Template พร้อมใช้!
```

---

## 🚀 API Endpoints

### **1. ดาวน์โหลด Excel Template**

```http
GET /api/students/import/template
```

**Response:**
- ไฟล์ Excel: `student-import-template.xlsx`

**ตัวอย่างการใช้:**
```bash
curl -O http://localhost:3001/api/students/import/template
```

---

### **2. ดึงรายชื่อสาขาวิชา**

```http
GET /api/students/import/majors
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "major_id": 1,
      "major_name": "วิศวกรรมคอมพิวเตอร์",
      "sections": [
        {
          "section_id": 1,
          "section_name": "1/1"
        }
      ]
    }
  ]
}
```

---

### **3. Preview Import (Validate)**

```http
POST /api/students/import/preview
Content-Type: multipart/form-data
```

**Body:**
- `file`: Excel file (max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "วิเคราะห์ไฟล์เสร็จสิ้น",
  "data": {
    "total_rows": 10,
    "valid_count": 8,
    "invalid_count": 2,
    "valid_students": [
      {
        "user_no": "67-020415-1001-6",
        "first_name": "สมชาย",
        "last_name": "ใจดี",
        "email": "[email protected]",
        "major_name": "วิศวกรรมคอมพิวเตอร์",
        "section_name": "1/1",
        "row_number": 2
      }
    ],
    "invalid_students": [
      {
        "user_no": "",
        "first_name": "สมศรี",
        "last_name": "ขยัน",
        "row_number": 5,
        "errors": [
          "รหัสนักศึกษาห้ามเป็นค่าว่าง"
        ]
      }
    ]
  }
}
```

---

### **4. Confirm Import (Save to Database)**

```http
POST /api/students/import/confirm
Content-Type: multipart/form-data
```

**Body:**
- `file`: Excel file (max 5MB)

**Response:**
```json
{
  "success": true,
  "message": "Import สำเร็จ 8 คน",
  "data": {
    "total_attempted": 8,
    "success_count": 8,
    "failed_count": 0,
    "invalid_count": 2,
    "success_students": [
      {
        "user_no": "67-020415-1001-6",
        "user_id": "uuid-here"
      }
    ],
    "failed_students": [],
    "invalid_students": []
  }
}
```

---

## 📋 Excel Template Structure

### **Sheet 1: นักศึกษา (Data Entry)**

| รหัสนักศึกษา* | ชื่อ* | นามสกุล* | อีเมล* | รหัสผ่าน* | สาขาวิชา* | กลุ่มเรียน |
|--------------|-------|---------|--------|----------|----------|-----------|
| 67-020415-1001-6 | สมชาย | ใจดี | [email protected] | password123 | วิศวกรรมคอมพิวเตอร์ | 1/1 |

**หมายเหตุ:**
- `*` = ฟิลด์บังคับ
- กลุ่มเรียนเป็น optional

### **Sheet 2: คำแนะนำ**
- อธิบายวิธีการใช้งาน
- กฎการ validate

### **Sheet 3: สาขาวิชา**
- รายชื่อสาขาที่มีในระบบ

---

## ✅ Validation Rules

### **1. รหัสนักศึกษา (user_no)**
- ✅ ต้องไม่เป็นค่าว่าง
- ✅ ต้องไม่ซ้ำกับในระบบ
- ⚠️ แนะนำรูปแบบ: `XX-XXXXXX-XXXX-X`

### **2. ชื่อ (first_name)**
- ✅ ต้องไม่เป็นค่าว่าง

### **3. นามสกุล (last_name)**
- ✅ ต้องไม่เป็นค่าว่าง

### **4. อีเมล (email)**
- ✅ ต้องไม่เป็นค่าว่าง
- ✅ ต้องเป็นรูปแบบอีเมลที่ถูกต้อง
- ✅ ต้องไม่ซ้ำกับในระบบ

### **5. รหัสผ่าน (password)**
- ✅ ต้องไม่เป็นค่าว่าง
- ✅ อย่างน้อย 6 ตัวอักษร
- 🔒 จะถูก hash ด้วย bcrypt ก่อนบันทึก

### **6. สาขาวิชา (major_name)**
- ✅ ต้องไม่เป็นค่าว่าง
- ✅ ต้องตรงกับสาขาที่มีในระบบ

### **7. กลุ่มเรียน (section_name)** - Optional
- ⚠️ ถ้าระบุ ต้องเป็นกลุ่มที่อยู่ในสาขานั้นๆ

---

##  📝 วิธีใช้งาน (Step by Step)

### **1. ดาวน์โหลด Template**

**ผ่าน Browser:**
```
http://localhost:3001/api/students/import/template
```

**ผ่าน cURL:**
```bash
curl -o student-template.xlsx http://localhost:3001/api/students/import/template
```

**หรือใช้ไฟล์ที่มีอยู่แล้ว:**
```
backend/student-import-template.xlsx
```

---

### **2. กรอกข้อมูล**

1. เปิดไฟล์ Excel
2. ไปที่ Sheet "นักศึกษา"
3. เริ่มกรอกข้อมูลจากแถวที่ 4 (ลบตัวอย่างในแถว 2-3 ได้)
4. กรอกข้อมูลตามคอลัมน์ที่กำหนด

**ตัวอย่างข้อมูล:**
```
67-020415-1001-6 | สมชาย | ใจดี | [email protected] | password123 | วิศวกรรมคอมพิวเตอร์ | 1/1
67-020415-1002-4 | สมหญิง | รักเรียน | [email protected] | password123 | วิศวกรรมคอมพิวเตอร์ | 1/1
```

---

### **3. Preview ข้อมูล (ทดสอบก่อน)**

**ผ่าน Postman/Insomnia:**
```http
POST http://localhost:3001/api/students/import/preview
Content-Type: multipart/form-data

Body:
- file: [เลือกไฟล์ Excel]
```

**ผ่าน cURL:**
```bash
curl -X POST http://localhost:3001/api/students/import/preview \
  -F "file=@student-template.xlsx"
```

**ดูผลลัพธ์:**
- ✅ `valid_count`: จำนวนข้อมูลถูกต้อง
- ❌ `invalid_count`: จำนวนข้อมูลผิดพลาด
- 📝 `invalid_students`: รายละเอียด errors

---

### **4. Import จริง (บันทึกเข้าระบบ)**

**เมื่อผล Preview ถูกต้อง:**
```bash
curl -X POST http://localhost:3001/api/students/import/confirm \
  -F "file=@student-template.xlsx"
```

**ผลลัพธ์:**
```json
{
  "success": true,
  "message": "Import สำเร็จ 10 คน",
  "data": {
    "success_count": 10,
    "failed_count": 0
  }
}
```

---

## 🧪 Testing (ทดสอบระบบ)

### **1. ทดสอบ Download Template**

```bash
curl -o test-template.xlsx http://localhost:3001/api/students/import/template
```

**Expected:**
- ✅ ไฟล์ `test-template.xlsx` ถูกดาวน์โหลด
- ✅ เปิดได้ด้วย Excel/Google Sheets
- ✅ มี 3 sheets: นักศึกษา, คำแนะนำ, สาขาวิชา

---

### **2. ทดสอบ Get Majors**

```bash
curl http://localhost:3001/api/students/import/majors
```

**Expected:**
```json
{
  "success": true,
  "data": [
    {
      "major_id": 1,
      "major_name": "...",
      "sections": [...]
    }
  ]
}
```

---

### **3. ทดสอบ Preview**

สร้างไฟล์ทดสอบด้วยข้อมูลดังนี้:

**ข้อมูลถูกต้อง:**
```
67-020415-9991-0 | ทดสอบ | ระบบ | [email protected] | test1234 | [สาขาจริง] | [กลุ่มจริง]
```

**ข้อมูลผิดพลาด:**
```
| ทดสอบ | ระบบ | invalid-email | 123 | ไม่มีสาขา |
```

```bash
curl -X POST http://localhost:3001/api/students/import/preview \
  -F "file=@test-file.xlsx"
```

**Expected:**
- ✅ `valid_count`: 1
- ❌ `invalid_count`: 1
- 📝 แสดง errors ชัดเจน

---

### **4. ทดสอบ Import**

```bash
curl -X POST http://localhost:3001/api/students/import/confirm \
  -F "file=@test-file.xlsx"
```

**Expected:**
- ✅ สร้าง user ในฐานข้อมูล
- ✅ password ถูก hash
- ✅ role = 'student'
- ✅ status = 'active'

**ตรวจสอบในฐานข้อมูล:**
```sql
SELECT * FROM "User" WHERE user_no = '67-020415-9991-0';
```

---

## 🔧 Error Handling

### **Common Errors:**

| Error | สาเหตุ | วิธีแก้ |
|-------|-------|--------|
| `กรุณาเลือกไฟล์ Excel` | ไม่ได้แนบไฟล์ | แนบไฟล์ใน form-data |
| `รองรับเฉพาะไฟล์ Excel` | ไฟล์ไม่ใช่ .xls/.xlsx | ใช้ไฟล์ Excel เท่านั้น |
| `ไฟล์มีขนาดใหญ่เกินไป` | ไฟล์ > 5MB | ลดขนาดไฟล์ |
| `รูปแบบไฟล์ไม่ถูกต้อง` | Header ไม่ตรง template | ใช้ template จากระบบ |
| `ไม่พบสาขาวิชา` | สาขาไม่มีในระบบ | ตรวจสอบชื่อสาขาให้ตรงกับระบบ |
| `รหัส นักศึกษามีอยู่แล้ว` | Duplicate user_no | เปลี่ยนรหัสนักศึกษา |

---

## 🎨 Frontend Integration Example

```javascript
// 1. ดาวน์โหลด Template
const downloadTemplate = async () => {
  const response = await fetch('http://localhost:3001/api/students/import/template');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student-template.xlsx';
  a.click();
};

// 2. Upload และ Preview
const previewImport = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3001/api/students/import/preview', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};

// 3. Confirm Import
const confirmImport = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3001/api/students/import/confirm', {
    method: 'POST',
    body: formData
  });

  return await response.json();
};

// React Component Example
function StudentImport() {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handlePreview = async () => {
    const result = await previewImport(file);
    setPreviewData(result.data);
  };

  const handleConfirm = async () => {
    const result = await confirmImport(file);
    alert(`Import สำเร็จ ${result.data.success_count} คน`);
  };

  return (
    <div>
      <button onClick={downloadTemplate}>ดาวน์โหลด Template</button>
      <input type="file" onChange={handleFileChange} accept=".xlsx,.xls" />
      <button onClick={handlePreview}>Preview</button>
      {previewData && (
        <>
          <p>ข้อมูลถูกต้อง: {previewData.valid_count}</p>
          <p>ข้อมูลผิดพลาด: {previewData.invalid_count}</p>
          <button onClick={handleConfirm} disabled={previewData.valid_count === 0}>
            ยืนยัน Import
          </button>
        </>
      )}
    </div>
  );
}
```

---

## 📊 Database Schema

**หลังจาก Import ข้อมูลจะถูกบันทึกดังนี้:**

```prisma
model User {
  user_id    String   @id @default(uuid())    // Auto-generated
  user_no    String?  @unique                  // จากคอลัมน์ "รหัสนักศึกษา*"
  first_name String?                           // จากคอลัมน์ "ชื่อ*"
  last_name  String?                           // จากคอลัมน์ "นามสกุล*"
  email      String?                           // จากคอลัมน์ "อีเมล*"
  password   String                            // Hashed จากคอลัมน์ "รหัสผ่าน*"
  role       UserRole                          // = 'student'
  status     String   @default("active")       // = 'active'
  major_id   Int?                              // Lookup จาก "สาขาวิชา*"
  section_id Int?                              // Lookup จาก "กลุ่มเรียน"
  created_at DateTime @default(now())
}
```

---

## ✅ Checklist

- [x] สร้าง Excel Template Generator
- [x] สร้าง Parse & Validate Service
- [x] สร้าง Import Controller
- [x] สร้าง Upload Middleware (Multer)
- [x] สร้าง API Routes
- [x] ติดตั้ง Dependencies (multer)
- [x] เพิ่ม Routes ใน server.js
- [x] สร้าง Excel Template ตัวอย่าง
- [x] เขียน Documentation
- [ ] ทดสอบ API endpoints
- [ ] สร้าง Frontend UI (ถ้าต้องการ)

---

## 🎉 System Ready!

ระบบพร้อมใช้งานแล้ว! ทดสอบได้ทันทีด้วย:

```bash
# 1. ดาวน์โหลด template
curl -o student.xlsx http://localhost:3001/api/students/import/template

# 2. แก้ไขไฟล์ Excel ให้ข้อมูลถูกต้อง

# 3. Upload และ Preview
curl -X POST http://localhost:3001/api/students/import/preview \
  -F "file=@student.xlsx"

# 4. ยืนยัน Import
curl -X POST http://localhost:3001/api/students/import/confirm \
  -F "file=@student.xlsx"
```

**Happy Importing! 🚀**
