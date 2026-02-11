import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { getStudentTemplateBuffer } from '../utils/excelTemplate.js';

const prisma = new PrismaClient();

/**
 * ========================================================================
 * Student Import Controller
 * ========================================================================
 */

// ==================== Helper Functions ====================

/**
 * Validate รหัสนักศึกษา
 */
const validateStudentCode = (studentCode) => {
    if (!studentCode) return false;
    // รูปแบบ: XX-XXXXXX-XXXX-X หรือตัวเลขล้วน
    const pattern = /^\d{2}-\d{6}-\d{4}-\d{1}$|^\d{13}$/;
    return pattern.test(studentCode.toString().trim());
};

/**
 * Parse และ validate ข้อมูลจาก Excel
 */
const parseStudentExcel = async (fileBuffer) => {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 2) {
        throw new Error('ไฟล์ว่างเปล่าหรือไม่มีข้อมูล');
    }

    // Skip header row
    const rows = data.slice(1).filter(row => row && row.length > 0 && row[0]);

    const validStudents = [];
    const invalidStudents = [];
    const parseErrors = [];

    // Get all majors from db for validation
    const majors = await prisma.major.findMany({
        include: { sections: true }
    });
    // Create maps for both code and name matching
    const majorCodeMap = new Map(majors.map(m => [m.code.toLowerCase(), m]));
    const majorNameMap = new Map(majors.map(m => [m.name.toLowerCase(), m]));

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Excel row number (1-indexed + header)

        const studentCode = row[0]?.toString().trim();
        const firstName = row[1]?.toString().trim();
        const lastName = row[2]?.toString().trim();
        const majorInput = row[3]?.toString().trim();
        const sectionName = row[4]?.toString().trim() || null;

        const errors = [];

        // Validate required fields
        if (!studentCode) errors.push('รหัสนักศึกษาว่างเปล่า');
        else if (!validateStudentCode(studentCode)) errors.push('รูปแบบรหัสนักศึกษาไม่ถูกต้อง');

        if (!firstName) errors.push('ชื่อว่างเปล่า');
        if (!lastName) errors.push('นามสกุลว่างเปล่า');

        // Validate major - try code first, then name
        let majorData = null;
        if (!majorInput) {
            errors.push('สาขาวิชาว่างเปล่า');
        } else {
            const lowerInput = majorInput.toLowerCase();
            // Try matching by code first, then by name
            majorData = majorCodeMap.get(lowerInput) || majorNameMap.get(lowerInput);
            if (!majorData) {
                errors.push(`ไม่พบสาขาวิชา "${majorInput}" ในระบบ (ใส่ได้ทั้ง code หรือชื่อเต็ม)`);
            }
        }

        // Validate section if provided
        let sectionData = null;
        if (sectionName && majorData) {
            sectionData = majorData.sections.find(s => s.name === sectionName);
            if (!sectionData) {
                errors.push(`ไม่พบกลุ่มเรียน "${sectionName}" ในสาขา "${majorData.name}"`);
            }
        }

        const studentData = {
            user_no: studentCode,
            first_name: firstName,
            last_name: lastName,
            major_name: majorInput,
            section_name: sectionName,
            majorId: majorData?.id || null,
            sectionId: sectionData?.id || null,
            rowNumber
        };

        if (errors.length > 0) {
            studentData.errors = errors;
            invalidStudents.push(studentData);
        } else {
            validStudents.push(studentData);
        }
    }

    return {
        totalRows: rows.length,
        validCount: validStudents.length,
        invalidCount: invalidStudents.length,
        validStudents,
        invalidStudents,
        parseErrors
    };
};

/**
 * Import นักศึกษาเข้าฐานข้อมูล
 */
const importStudentsToDatabase = async (students) => {
    const success = [];
    const failed = [];

    for (const student of students) {
        try {
            // Check if student already exists
            const existing = await prisma.user.findUnique({
                where: { studentCode: student.user_no }
            });

            if (existing) {
                failed.push({
                    ...student,
                    error: 'รหัสนักศึกษาซ้ำในระบบ'
                });
                continue;
            }

            // Generate email from student code
            const digits = student.user_no.replace(/\D/g, '');
            const email = `s${digits}@email.kmutnb.ac.th`;

            // Create user
            const user = await prisma.user.create({
                data: {
                    studentCode: student.user_no,
                    firstName: student.first_name,
                    lastName: student.last_name,
                    email,
                    role: 'STUDENT',
                    score: 100,
                    sectionId: student.sectionId || null
                }
            });

            success.push({
                user_no: student.user_no,
                first_name: student.first_name,
                last_name: student.last_name,
                email,
                userId: user.id
            });
        } catch (error) {
            failed.push({
                ...student,
                error: error.message
            });
        }
    }

    return { success, failed };
};

// ==================== Controller Functions ====================

/**
 * ดาวน์โหลด Excel Template
 */
export const downloadTemplate = async (req, res) => {
    try {
        const buffer = getStudentTemplateBuffer();

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=student-import-template.xlsx'
        );

        return res.send(buffer);
    } catch (error) {
        console.error('Error generating template:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้าง Template',
            error: error.message
        });
    }
};

/**
 * Preview ข้อมูล (validate before import)
 */
export const previewImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกไฟล์ Excel'
            });
        }

        const result = await parseStudentExcel(req.file.buffer);

        return res.json({
            success: true,
            message: 'วิเคราะห์ไฟล์เสร็จสิ้น',
            data: {
                totalRows: result.totalRows,
                validCount: result.validCount,
                invalidCount: result.invalidCount,
                validStudents: result.validStudents.map(s => ({
                    user_no: s.user_no,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    email: s.email,
                    major_name: s.major_name,
                    section_name: s.section_name || '-',
                    rowNumber: s.rowNumber
                })),
                invalidStudents: result.invalidStudents.map(s => ({
                    user_no: s.user_no,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    rowNumber: s.rowNumber,
                    errors: s.errors
                })),
                parseErrors: result.parseErrors
            }
        });
    } catch (error) {
        console.error('Error previewing import:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Import ข้อมูลจริง (confirm import)
 */
export const confirmImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกไฟล์ Excel'
            });
        }

        const parseResult = await parseStudentExcel(req.file.buffer);

        if (parseResult.validCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'ไม่มีข้อมูลที่ถูกต้องสำหรับ Import',
                data: {
                    invalidStudents: parseResult.invalidStudents
                }
            });
        }

        const importResult = await importStudentsToDatabase(parseResult.validStudents);

        return res.json({
            success: true,
            message: `Import สำเร็จ ${importResult.success.length} คน`,
            data: {
                totalAttempted: parseResult.validCount,
                successCount: importResult.success.length,
                failedCount: importResult.failed.length,
                invalidCount: parseResult.invalidCount,
                successStudents: importResult.success,
                failedStudents: importResult.failed,
                invalidStudents: parseResult.invalidStudents.map(s => ({
                    user_no: s.user_no,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    rowNumber: s.rowNumber,
                    errors: s.errors
                }))
            }
        });
    } catch (error) {
        console.error('Error confirming import:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการ Import ข้อมูล',
            error: error.message
        });
    }
};

/**
 * ดึงรายชื่อสาขาวิชาทั้งหมด (สำหรับแสดงใน UI)
 */
export const getMajors = async (req, res) => {
    try {
        const majors = await prisma.major.findMany({
            include: {
                sections: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return res.json({
            success: true,
            data: majors
        });
    } catch (error) {
        console.error('Error fetching majors:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสาขาวิชา',
            error: error.message
        });
    }
};
