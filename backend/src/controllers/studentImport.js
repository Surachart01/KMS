import { getStudentTemplateBuffer } from '../utils/excelTemplate.js';
import { parseStudentExcel, importStudentsToDatabase } from '../services/studentImportService.js';

/**
 * ========================================================================
 * Student Import Controller
 * ========================================================================
 */

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
        // ตรวจสอบว่ามีไฟล์อัปโหลดมาหรือไม่
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกไฟล์ Excel'
            });
        }

        // Parse และ validate
        const result = await parseStudentExcel(req.file.buffer);

        return res.json({
            success: true,
            message: 'วิเคราะห์ไฟล์เสร็จสิ้น',
            data: {
                total_rows: result.total_rows,
                valid_count: result.valid_count,
                invalid_count: result.invalid_count,
                valid_students: result.valid_students.map(s => ({
                    user_no: s.user_no,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    email: s.email,
                    major_name: s.major_name,
                    section_name: s.section_name || '-',
                    row_number: s.rowNumber
                })),
                invalid_students: result.invalid_students.map(s => ({
                    user_no: s.user_no,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    row_number: s.rowNumber,
                    errors: s.errors
                })),
                parse_errors: result.parse_errors
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
        // ตรวจสอบว่ามีไฟล์อัปโหลดมาหรือไม่
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือกไฟล์ Excel'
            });
        }

        // Parse และ validate
        const parseResult = await parseStudentExcel(req.file.buffer);

        if (parseResult.valid_count === 0) {
            return res.status(400).json({
                success: false,
                message: 'ไม่มีข้อมูลที่ถูกต้องสำหรับ Import',
                data: {
                    invalid_students: parseResult.invalid_students
                }
            });
        }

        // Import เข้าฐานข้อมูล
        const importResult = await importStudentsToDatabase(parseResult.valid_students);

        return res.json({
            success: true,
            message: `Import สำเร็จ ${importResult.success.length} คน`,
            data: {
                total_attempted: parseResult.valid_count,
                success_count: importResult.success.length,
                failed_count: importResult.failed.length,
                invalid_count: parseResult.invalid_count,
                success_students: importResult.success,
                failed_students: importResult.failed,
                invalid_students: parseResult.invalid_students.map(s => ({
                    user_no: s.user_no,
                    first_name: s.first_name,
                    last_name: s.last_name,
                    row_number: s.rowNumber,
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
        const { default: prisma } = await import('../../prisma/client.js');

        const majors = await prisma.major.findMany({
            include: {
                sections: {
                    select: {
                        section_id: true,
                        section_name: true
                    }
                }
            },
            orderBy: {
                major_name: 'asc'
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
