import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // =============================
    // สร้างสาขาวิชา (Major)
    // TCT = เทคโนโลยีคอมพิวเตอร์
    // CED = คอมพิวเตอร์ศึกษา
    // =============================
    const majorTCT = await prisma.major.upsert({
        where: { code: 'TCT' },
        update: {},
        create: {
            code: 'TCT',
            name: 'เทคโนโลยีคอมพิวเตอร์'
        }
    });

    const majorCED = await prisma.major.upsert({
        where: { code: 'CED' },
        update: {},
        create: {
            code: 'CED',
            name: 'คอมพิวเตอร์ศึกษา'
        }
    });
    console.log('✅ Created 2 majors: TCT, CED');

    // =============================
    // สร้างกลุ่มเรียน (Section)
    // TCT: DE-RA, DE-RB
    // CED: DE-RA
    // =============================
    const sectionTCT_DERA = await prisma.section.upsert({
        where: { id: 'tct-de-ra' },
        update: {},
        create: {
            id: 'tct-de-ra',
            name: 'DE-RA',
            majorId: majorTCT.id
        }
    });

    const sectionTCT_DERB = await prisma.section.upsert({
        where: { id: 'tct-de-rb' },
        update: {},
        create: {
            id: 'tct-de-rb',
            name: 'DE-RB',
            majorId: majorTCT.id
        }
    });

    const sectionCED_DERA = await prisma.section.upsert({
        where: { id: 'ced-de-ra' },
        update: {},
        create: {
            id: 'ced-de-ra',
            name: 'DE-RA',
            role: 'TEACHER'
        }
    });
    console.log('✅ Created 3 sections: TCT(DE-RA, DE-RB), CED(DE-RA)');

    // =============================
    // สร้าง Staff User (Admin)
    // =============================
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const staff = await prisma.user.upsert({
        where: { studentCode: 'STAFF001' },
        update: {},
        create: {
            studentCode: 'STAFF001',
            email: 'admin@kmutnb.ac.th',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'System',
            role: 'STAFF'
        }
    });
    console.log('✅ Created staff user:', staff.email);

    // =============================
    // สร้างอาจารย์ตัวอย่าง
    // =============================
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher1 = await prisma.user.upsert({
        where: { studentCode: 'T001' },
        update: {},
        create: {
            studentCode: 'T001',
            email: 'teacher@kmutnb.ac.th',
            password: teacherPassword,
            firstName: 'สมหญิง',
            lastName: 'ครูดี',
            role: 'TEACHER',
            role: 'TEACHER'
        }
    });

    const teacher2 = await prisma.user.upsert({
        where: { studentCode: 'T002' },
        update: {},
        create: {
            studentCode: 'T002',
            email: 'teacher2@kmutnb.ac.th',
            password: teacherPassword,
            firstName: 'สมศักดิ์',
            lastName: 'อาจารย์',
            role: 'TEACHER',
        }
    });
    console.log('✅ Created 2 teacher users');

    // =============================
    // สร้างนักศึกษาตัวอย่าง
    // =============================
    const studentPassword = await bcrypt.hash('student123', 10);

    // นักศึกษา TCT DE-RA
    const student1 = await prisma.user.upsert({
        where: { studentCode: 's6702041510164' },
        update: {},
        create: {
            studentCode: 's6702041510164',
            email: 'student@email.kmutnb.ac.th',
            password: studentPassword,
            firstName: 'สมชาย',
            lastName: 'ใจดี',
            role: 'STUDENT',
            sectionId: sectionTCT_DERA.id
        }
    });

    // นักศึกษา TCT DE-RB
    const student2 = await prisma.user.upsert({
        where: { studentCode: 's6702041510165' },
        update: {},
        create: {
            studentCode: 's6702041510165',
            email: 'student2@email.kmutnb.ac.th',
            password: studentPassword,
            firstName: 'สมหญิง',
            lastName: 'ดีใจ',
            role: 'STUDENT',
            sectionId: sectionTCT_DERB.id
        }
    });

    // นักศึกษา CED DE-RA
    const student3 = await prisma.user.upsert({
        where: { studentCode: 's6702041520001' },
        update: {},
        create: {
            studentCode: 's6702041520001',
            email: 'student3@email.kmutnb.ac.th',
            password: studentPassword,
            firstName: 'วิชัย',
            lastName: 'เรียนดี',
            role: 'STUDENT',
            sectionId: sectionCED_DERA.id
        }
    });
    console.log('✅ Created 3 student users');

    // =============================
    // สร้างรายวิชา (Subject)
    // =============================
    const subject1 = await prisma.subject.upsert({
        where: { code: '020413215' },
        update: {},
        create: {
            code: '020413215',
            name: 'ปัญญาประดิษฐ์'
        }
    });

    const subject2 = await prisma.subject.upsert({
        where: { code: 'CS201' },
        update: {},
        create: {
            code: 'CS201',
            name: 'โครงสร้างข้อมูล'
        }
    });

    const subject3 = await prisma.subject.upsert({
        where: { code: 'CS301' },
        update: {},
        create: {
            code: 'CS301',
            name: 'ฐานข้อมูล'
        }
    });

    const subject4 = await prisma.subject.upsert({
        where: { code: 'CS101' },
        update: {},
        create: {
            code: 'CS101',
            name: 'การเขียนโปรแกรมเบื้องต้น'
        }
    });
    console.log('✅ Created 4 subjects');

    // =============================
    // สร้างกุญแจ (Key)
    // รูปแบบ: XX-YYY (XX = เลขตึก, YYY = เลขห้อง)
    // ตึก 44 และ ตึก 52
    // =============================

    // === ตึก 44 ===
    const key44_703 = await prisma.key.upsert({
        where: { id: 'key-44-703' },
        update: {},
        create: {
            id: 'key-44-703',
            roomCode: '44-703',
            slotNumber: 1
        }
    });

    const key44_704 = await prisma.key.upsert({
        where: { id: 'key-44-704' },
        update: {},
        create: {
            id: 'key-44-704',
            roomCode: '44-704',
            slotNumber: 2
        }
    });

    const key44_705 = await prisma.key.upsert({
        where: { id: 'key-44-705' },
        update: {},
        create: {
            id: 'key-44-705',
            roomCode: '44-705',
            slotNumber: 3
        }
    });

    const key44_801 = await prisma.key.upsert({
        where: { id: 'key-44-801' },
        update: {},
        create: {
            id: 'key-44-801',
            roomCode: '44-801',
            slotNumber: 4
        }
    });

    const key44_802 = await prisma.key.upsert({
        where: { id: 'key-44-802' },
        update: {},
        create: {
            id: 'key-44-802',
            roomCode: '44-802',
            slotNumber: 5
        }
    });

    // === ตึก 52 ===
    const key52_211 = await prisma.key.upsert({
        where: { id: 'key-52-211' },
        update: {},
        create: {
            id: 'key-52-211',
            roomCode: '52-211',
            slotNumber: 6
        }
    });

    const key52_212 = await prisma.key.upsert({
        where: { id: 'key-52-212' },
        update: {},
        create: {
            id: 'key-52-212',
            roomCode: '52-212',
            slotNumber: 7
        }
    });

    const key52_213 = await prisma.key.upsert({
        where: { id: 'key-52-213' },
        update: {},
        create: {
            id: 'key-52-213',
            roomCode: '52-213',
            slotNumber: 8
        }
    });

    const key52_311 = await prisma.key.upsert({
        where: { id: 'key-52-311' },
        update: {},
        create: {
            id: 'key-52-311',
            roomCode: '52-311',
            slotNumber: 9
        }
    });

    const key52_312 = await prisma.key.upsert({
        where: { id: 'key-52-312' },
        update: {},
        create: {
            id: 'key-52-312',
            roomCode: '52-312',
            slotNumber: 10
        }
    });
    console.log('✅ Created 10 keys (Building 44: 5, Building 52: 5)');

    // =============================
    // สร้างตารางเรียน (Schedule)
    // =============================
    await prisma.schedule.deleteMany({});

    // ตึก 44
    const schedule1 = await prisma.schedule.create({
        data: {
            subjectId: subject1.id,
            roomCode: '44-703',
            section: 'TCT DE-RA',
            teacherId: teacher1.id,
            dayOfWeek: 5, // Friday
            startTime: new Date('2024-01-01T13:00:00Z'),
            endTime: new Date('2024-01-01T16:00:00Z')
        }
    });

    const schedule2 = await prisma.schedule.create({
        data: {
            subjectId: subject2.id,
            roomCode: '44-704',
            section: 'TCT DE-RB',
            teacherId: teacher1.id,
            dayOfWeek: 3, // Wednesday
            startTime: new Date('2024-01-01T09:00:00Z'),
            endTime: new Date('2024-01-01T12:00:00Z')
        }
    });

    const schedule3 = await prisma.schedule.create({
        data: {
            subjectId: subject3.id,
            roomCode: '44-705',
            section: 'CED DE-RA',
            teacherId: teacher2.id,
            dayOfWeek: 1, // Monday
            startTime: new Date('2024-01-01T09:00:00Z'),
            endTime: new Date('2024-01-01T12:00:00Z')
        }
    });

    const schedule4 = await prisma.schedule.create({
        data: {
            subjectId: subject4.id,
            roomCode: '44-801',
            section: 'TCT DE-RA',
            teacherId: teacher1.id,
            dayOfWeek: 2, // Tuesday
            startTime: new Date('2024-01-01T13:00:00Z'),
            endTime: new Date('2024-01-01T16:00:00Z')
        }
    });

    // ตึก 52
    const schedule5 = await prisma.schedule.create({
        data: {
            subjectId: subject1.id,
            roomCode: '52-211',
            section: 'TCT DE-RB',
            teacherId: teacher1.id,
            dayOfWeek: 1, // Monday
            startTime: new Date('2024-01-01T13:00:00Z'),
            endTime: new Date('2024-01-01T16:00:00Z')
        }
    });

    const schedule6 = await prisma.schedule.create({
        data: {
            subjectId: subject2.id,
            roomCode: '52-212',
            section: 'CED DE-RA',
            teacherId: teacher2.id,
            dayOfWeek: 4, // Thursday
            startTime: new Date('2024-01-01T09:00:00Z'),
            endTime: new Date('2024-01-01T12:00:00Z')
        }
    });

    const schedule7 = await prisma.schedule.create({
        data: {
            subjectId: subject3.id,
            roomCode: '52-213',
            section: 'TCT DE-RA',
            teacherId: teacher1.id,
            dayOfWeek: 4, // Thursday
            startTime: new Date('2024-01-01T13:00:00Z'),
            endTime: new Date('2024-01-01T16:00:00Z')
        }
    });

    const schedule8 = await prisma.schedule.create({
        data: {
            subjectId: subject4.id,
            roomCode: '52-311',
            section: 'TCT DE-RB',
            teacherId: teacher1.id,
            dayOfWeek: 5, // Friday
            startTime: new Date('2024-01-01T09:00:00Z'),
            endTime: new Date('2024-01-01T12:00:00Z')
        }
    });
    console.log('✅ Created 8 schedules (Building 44: 4, Building 52: 4)');

    // =============================
    // สร้าง Penalty Config
    // =============================
    await prisma.penaltyConfig.deleteMany({});
    const penaltyConfig = await prisma.penaltyConfig.create({
        data: {
            graceMinutes: 30,         // ผ่อนผัน 30 นาที
            scorePerInterval: 5,      // หักคะแนน 5 คะแนน
            intervalMinutes: 15,      // ทุก 15 นาที
            isActive: true
        }
    });
    console.log('✅ Created penalty config');

    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('===============================');
    console.log('       MAJORS & SECTIONS       ');
    console.log('===============================');
    console.log('Major: TCT (เทคโนโลยีคอมพิวเตอร์)');
    console.log('  - Section: DE-RA');
    console.log('  - Section: DE-RB');
    console.log('Major: CED (คอมพิวเตอร์ศึกษา)');
    console.log('  - Section: DE-RA');
    console.log('');
    console.log('===============================');
    console.log('        DEFAULT USERS          ');
    console.log('===============================');
    console.log('Staff:    admin@kmutnb.ac.th / admin123');
    console.log('Teacher1: teacher@kmutnb.ac.th / teacher123');
    console.log('Teacher2: teacher2@kmutnb.ac.th / teacher123');
    console.log('Student1: student@email.kmutnb.ac.th / student123 (TCT DE-RA)');
    console.log('Student2: student2@email.kmutnb.ac.th / student123 (TCT DE-RB)');
    console.log('Student3: student3@email.kmutnb.ac.th / student123 (CED DE-RA)');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
