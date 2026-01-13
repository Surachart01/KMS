import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // สร้าง Staff User
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const staff = await prisma.user.upsert({
        where: { user_no: 'STAFF001' },
        update: {},
        create: {
            user_no: 'STAFF001',
            first_name: 'Admin',
            last_name: 'System',
            email: 'admin@kmutnb.ac.th',
            password: hashedPassword,
            role: 'staff',
            status: 'active'
        }
    });
    console.log('✅ Created staff user:', staff.email);

    // สร้างสาขาวิชา
    const majors = await Promise.all([
        prisma.major.upsert({
            where: { major_id: 1 },
            update: {},
            create: {
                major_name: 'คอมพิวเตอร์ศึกษา'
            }
        }),
        prisma.major.upsert({
            where: { major_id: 2 },
            update: {},
            create: {
                major_name: 'วิศวกรรมคอมพิวเตอร์'
            }
        }),
        prisma.major.upsert({
            where: { major_id: 3 },
            update: {},
            create: {
                major_name: 'เทคโนโลยีสารสนเทศ'
            }
        })
    ]);
    console.log('✅ Created', majors.length, 'majors');

    // สร้างกลุ่มเรียน
    const sections = await Promise.all([
        prisma.section.upsert({
            where: { section_id: 1 },
            update: {},
            create: {
                section_name: '1/1',
                major_id: 1
            }
        }),
        prisma.section.upsert({
            where: { section_id: 2 },
            update: {},
            create: {
                section_name: '1/2',
                major_id: 1
            }
        }),
        prisma.section.upsert({
            where: { section_id: 3 },
            update: {},
            create: {
                section_name: '2/1',
                major_id: 2
            }
        })
    ]);
    console.log('✅ Created', sections.length, 'sections');

    // สร้างห้องเรียน
    const rooms = await Promise.all([
        prisma.room.upsert({
            where: { room_id: 'C-301' },
            update: {},
            create: {
                room_id: 'C-301',
                room_name: 'ห้องปฏิบัติการคอมพิวเตอร์ 1',
                building: 'C',
                floor: 3,
                status: 'available'
            }
        }),
        prisma.room.upsert({
            where: { room_id: 'C-302' },
            update: {},
            create: {
                room_id: 'C-302',
                room_name: 'ห้องปฏิบัติการคอมพิวเตอร์ 2',
                building: 'C',
                floor: 3,
                status: 'available'
            }
        }),
        prisma.room.upsert({
            where: { room_id: 'C-303' },
            update: {},
            create: {
                room_id: 'C-303',
                room_name: 'ห้องสัมมนา',
                building: 'C',
                floor: 3,
                status: 'available'
            }
        }),
        prisma.room.upsert({
            where: { room_id: 'C-401' },
            update: {},
            create: {
                room_id: 'C-401',
                room_name: 'ห้องเรียนรวม 1',
                building: 'C',
                floor: 4,
                status: 'available'
            }
        })
    ]);
    console.log('✅ Created', rooms.length, 'rooms');

    // สร้างรายวิชา
    const subjects = await Promise.all([
        prisma.subject.upsert({
            where: { subject_code: 'CS101' },
            update: {},
            create: {
                subject_code: 'CS101',
                subject_name: 'การเขียนโปรแกรมเบื้องต้น'
            }
        }),
        prisma.subject.upsert({
            where: { subject_code: 'CS201' },
            update: {},
            create: {
                subject_code: 'CS201',
                subject_name: 'โครงสร้างข้อมูล'
            }
        }),
        prisma.subject.upsert({
            where: { subject_code: 'CS301' },
            update: {},
            create: {
                subject_code: 'CS301',
                subject_name: 'ฐานข้อมูล'
            }
        })
    ]);
    console.log('✅ Created', subjects.length, 'subjects');

    // สร้างกุญแจ
    const keys = await Promise.all([
        prisma.key.upsert({
            where: { key_id: 'KEY-C301' },
            update: {},
            create: {
                key_id: 'KEY-C301',
                room_id: 'C-301',
                cabinet_slot: 1,
                nfc_uid: 'NFC001',
                status: 'in_cabinet'
            }
        }),
        prisma.key.upsert({
            where: { key_id: 'KEY-C302' },
            update: {},
            create: {
                key_id: 'KEY-C302',
                room_id: 'C-302',
                cabinet_slot: 2,
                nfc_uid: 'NFC002',
                status: 'in_cabinet'
            }
        }),
        prisma.key.upsert({
            where: { key_id: 'KEY-C303' },
            update: {},
            create: {
                key_id: 'KEY-C303',
                room_id: 'C-303',
                cabinet_slot: 3,
                nfc_uid: 'NFC003',
                status: 'in_cabinet'
            }
        }),
        prisma.key.upsert({
            where: { key_id: 'KEY-C401' },
            update: {},
            create: {
                key_id: 'KEY-C401',
                room_id: 'C-401',
                cabinet_slot: 4,
                nfc_uid: 'NFC004',
                status: 'in_cabinet'
            }
        })
    ]);
    console.log('✅ Created', keys.length, 'keys');

    // สร้างเหตุผลการเบิก
    const borrowReasons = await Promise.all([
        prisma.borrowReason.upsert({
            where: { reason_id: 'STUDY' },
            update: {},
            create: {
                reason_id: 'STUDY',
                reason_name: 'การเรียน',
                require_note: false
            }
        }),
        prisma.borrowReason.upsert({
            where: { reason_id: 'MEETING' },
            update: {},
            create: {
                reason_id: 'MEETING',
                reason_name: 'ประชุม',
                require_note: true
            }
        }),
        prisma.borrowReason.upsert({
            where: { reason_id: 'ACTIVITY' },
            update: {},
            create: {
                reason_id: 'ACTIVITY',
                reason_name: 'กิจกรรม',
                require_note: true
            }
        }),
        prisma.borrowReason.upsert({
            where: { reason_id: 'OTHER' },
            update: {},
            create: {
                reason_id: 'OTHER',
                reason_name: 'อื่นๆ',
                require_note: true
            }
        })
    ]);
    console.log('✅ Created', borrowReasons.length, 'borrow reasons');

    // สร้างตารางเรียน
    const schedules = await Promise.all([
        prisma.classSchedule.create({
            data: {
                subject_code: 'CS101',
                room_id: 'C-301',
                day_of_week: 1, // Monday
                start_time: new Date('2024-06-01T09:00:00Z'),
                end_time: new Date('2024-06-01T12:00:00Z'),
                semester: '1',
                academic_year: 2567
            }
        }),
        prisma.classSchedule.create({
            data: {
                subject_code: 'CS201',
                room_id: 'C-301',
                day_of_week: 3, // Wednesday
                start_time: new Date('2024-06-01T13:00:00Z'),
                end_time: new Date('2024-06-01T16:00:00Z'),
                semester: '1',
                academic_year: 2567
            }
        }),
        prisma.classSchedule.create({
            data: {
                subject_code: 'CS301',
                room_id: 'C-302',
                day_of_week: 5, // Friday
                start_time: new Date('2024-06-01T09:00:00Z'),
                end_time: new Date('2024-06-01T12:00:00Z'),
                semester: '1',
                academic_year: 2567
            }
        })
    ]);
    console.log('✅ Created', schedules.length, 'class schedules');

    // สร้างนักศึกษาตัวอย่าง
    const studentPassword = await bcrypt.hash('student123', 10);
    const student = await prisma.user.upsert({
        where: { user_no: 's6702041510164' },
        update: {},
        create: {
            user_no: 's6702041510164',
            first_name: 'สมชาย',
            last_name: 'ใจดี',
            email: 'student@email.kmutnb.ac.th',
            password: studentPassword,
            role: 'student',
            status: 'active',
            major_id: 1,
            section_id: 1
        }
    });
    console.log('✅ Created student user:', student.email);

    // สร้างอาจารย์ตัวอย่าง
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher = await prisma.user.upsert({
        where: { user_no: 'T001' },
        update: {},
        create: {
            user_no: 'T001',
            first_name: 'สมหญิง',
            last_name: 'ครูดี',
            email: 'teacher@kmutnb.ac.th',
            password: teacherPassword,
            role: 'teacher',
            status: 'active',
            major_id: 1
        }
    });
    console.log('✅ Created teacher user:', teacher.email);

    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('Default Users:');
    console.log('==============');
    console.log('Staff:   admin@kmutnb.ac.th / admin123');
    console.log('Teacher: teacher@kmutnb.ac.th / teacher123');
    console.log('Student: student@email.kmutnb.ac.th / student123');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
