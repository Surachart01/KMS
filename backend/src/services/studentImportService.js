import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import prisma from '../../prisma/client.js';

/**
 * ========================================================================
 * Excel Student Import Service
 * ========================================================================
 * ให้บริการ parse และ validate ข้อมูลนักศึกษาจาก Excel
 * ========================================================================
 */

/**
 * Parse Excel file และ validate ข้อมูล
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Promise<Object>} - Parsed and validated data
 */
export async function parseStudentExcel(fileBuffer) {
    try {
        // 1. อ่านไฟล์ Excel
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        // 2. ดึงข้อมูลจาก Sheet แรก
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 3. แปลงเป็น JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // ใช้ array แทน object เพื่อจัดการ header เอง
            defval: '' // ค่า default สำหรับ cell ว่าง
        });

        // 4. ตรวจสอบว่ามีข้อมูล
        if (rawData.length < 2) {
            throw new Error('ไฟล์ Excel ไม่มีข้อมูล กรุณาเพิ่มข้อมูลนักศึกษาอย่างน้อย 1 คน');
        }

        // 5. อ่าน header (แถวแรก)
        const headers = rawData[0];
        const expectedHeaders = [
            'รหัสนักศึกษา*',
            'ชื่อ*',
            'นามสกุล*',
            'สาขาวิชา*',
            'กลุ่มเรียน'
        ];

        // ตรวจสอบ header
        if (!validateHeaders(headers, expectedHeaders)) {
            throw new Error('รูปแบบไฟล์ไม่ถูกต้อง กรุณาใช้ Template ที่ระบบจัดเตรียมไว้');
        }

        // 6. Parse rows (ข้ามแถวแรก และแถวตัวอย่าง)
        const students = [];
        const errors = [];

        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];

            // ข้ามแถวว่าง
            if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
                continue;
            }

            try {
                // Auto-generate email immediately during parsing
                const user_no = row[0]?.toString().trim() || '';
                let email = '';
                const digits = user_no.replace(/\D/g, '');
                if (digits.length > 0) {
                    email = `s${digits}@email.kmutnb.ac.th`;
                }

                const student = {
                    user_no: user_no,
                    first_name: row[1]?.toString().trim() || '',
                    last_name: row[2]?.toString().trim() || '',
                    email: email,
                    major_name: row[3]?.toString().trim() || '',
                    section_name: row[4]?.toString().trim() || '',
                    rowNumber: i + 1 // เก็บเลขแถวสำหรับ error reporting
                };

                students.push(student);
            } catch (error) {
                errors.push({
                    row: i + 1,
                    error: error.message
                });
            }
        }

        if (students.length === 0) {
            throw new Error('ไม่พบข้อมูลนักศึกษาที่ถูกต้องในไฟล์');
        }

        // 7. Validate แต่ละ record
        const validationResult = await validateStudents(students);

        return {
            success: true,
            totalRows: students.length,
            validCount: validationResult.valid.length,
            invalidCount: validationResult.invalid.length,
            validStudents: validationResult.valid,
            invalidStudents: validationResult.invalid,
            parseErrors: errors
        };

    } catch (error) {
        throw new Error(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${error.message}`);
    }
}

/**
 * Validate headers
 */
function validateHeaders(actual, expected) {
    if (!actual || actual.length < expected.length) {
        return false;
    }

    for (let i = 0; i < expected.length; i++) {
        if (actual[i]?.toString().trim() !== expected[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Validate student records
 */
async function validateStudents(students) {
    const valid = [];
    const invalid = [];

    // ดึงข้อมูล majors และ sections จาก database
    const majors = await prisma.major.findMany({
        include: {
            sections: true
        }
    });

    // สร้าง map สำหรับค้นหาเร็ว (รองรับทั้ง name และ code)
    const majorByName = new Map(majors.map(m => [m.name, m]));
    const majorByCode = new Map(majors.map(m => [m.code, m]));

    // ดึงรหัสนักศึกษาที่มีอยู่แล้ว
    const existingUserNos = await prisma.user.findMany({
        where: {
            studentCode: {
                in: students.map(s => s.user_no)
            }
        },
        select: { studentCode: true }
    });
    const existingUserNoSet = new Set(existingUserNos.map(u => u.studentCode));

    // ดึงอีเมลที่มีอยู่แล้ว
    const emailsToCheck = students.map(s => s.email).filter(e => e); // Filter out empty/undefined
    const existingEmails = await prisma.user.findMany({
        where: {
            email: {
                in: emailsToCheck
            }
        },
        select: { email: true }
    });
    const existingEmailSet = new Set(existingEmails.map(u => u.email));

    for (const student of students) {
        const validationErrors = [];

        // 1. Validate รหัสนักศึกษา
        if (!student.user_no) {
            validationErrors.push('รหัสนักศึกษาห้ามเป็นค่าว่าง');
        } else if (existingUserNoSet.has(student.user_no)) {
            validationErrors.push(`รหัสนักศึกษา ${student.user_no} มีอยู่ในระบบแล้ว`);
        }

        // 2. Validate ชื่อ
        if (!student.first_name) {
            validationErrors.push('ชื่อห้ามเป็นค่าว่าง');
        }

        // 3. Validate นามสกุล
        if (!student.last_name) {
            validationErrors.push('นามสกุลห้ามเป็นค่าว่าง');
        }

        // 4. Validate อีเมล
        // Email is already generated in parsing step.

        if (!student.email) {
            validationErrors.push('ไม่สามารถสร้างอีเมลได้ (ตรวจสอบรหัสนักศึกษา)');
        }

        if (student.email && existingEmailSet.has(student.email)) {
            // This might happen if user_no is unique but email is used by someone else (rare?)
            validationErrors.push(`อีเมล ${student.email} มีอยู่ในระบบแล้ว`);
        }

        // 5. รหัสผ่าน - ข้ามการ validate เพราะ auto-generate
        // Password will be auto-generated from user_no

        // 6. Validate สาขาวิชา
        if (!student.major_name) {
            validationErrors.push('สาขาวิชาห้ามเป็นค่าว่าง');
        } else {
            // ค้นหาโดย name หรือ code
            const major = majorByName.get(student.major_name) || majorByCode.get(student.major_name);
            if (!major) {
                validationErrors.push(`ไม่พบสาขาวิชา "${student.major_name}" ในระบบ`);
            } else {
                student.major_id = major.id;

                // 7. Validate กลุ่มเรียน (ถ้ามี)
                if (student.section_name) {
                    const section = major.sections.find(s => s.name === student.section_name);
                    if (!section) {
                        validationErrors.push(`ไม่พบกลุ่มเรียน "${student.section_name}" ในสาขา "${student.major_name}"`);
                    } else {
                        student.section_id = section.id;
                    }
                }
            }
        }

        if (validationErrors.length > 0) {
            invalid.push({
                ...student,
                errors: validationErrors
            });
        } else {
            valid.push(student);
        }
    }

    return { valid, invalid };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Import students to database
 */
export async function importStudentsToDatabase(students) {
    const results = {
        success: [],
        failed: []
    };

    for (const student of students) {
        try {
            // Auto-generate password from user_no (รหัสนักศึกษา)
            const defaultPassword = student.user_no; // ใช้รหัสนักศึกษาเป็นรหัสผ่าน default
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // Create user
            const createdUser = await prisma.user.create({
                data: {
                    studentCode: student.user_no,
                    firstName: student.first_name,
                    lastName: student.last_name,
                    email: student.email,
                    password: hashedPassword,
                    role: 'STUDENT',
                    sectionId: student.section_id || null,
                    isBanned: false
                }
            });

            results.success.push({
                user_no: student.user_no,
                user_id: createdUser.user_id
            });

        } catch (error) {
            results.failed.push({
                user_no: student.user_no,
                error: error.message
            });
        }
    }

    return results;
}
