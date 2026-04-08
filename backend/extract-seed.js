import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('Extracting data from database...');

  const majors = await prisma.major.findMany();
  const sections = await prisma.section.findMany();
  const users = await prisma.user.findMany();
  const subjects = await prisma.subject.findMany();
  const subjectTeachers = await prisma.subjectTeacher.findMany();
  const keys = await prisma.key.findMany();
  const schedules = await prisma.schedule.findMany();
  const borrowReasons = await prisma.borrowReason.findMany();
  const penaltyConfigs = await prisma.penaltyConfig.findMany();
  const bookings = await prisma.booking.findMany();
  const penaltyLogs = await prisma.penaltyLog.findMany();
  const dailyAuthorizations = await prisma.dailyAuthorization.findMany();
  const systemLogs = await prisma.systemLog.findMany();

  const stringifyData = (data) => {
    return JSON.stringify(data, null, 2).replace(/"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)"/g, 'new Date("$1")');
  };

  const seedScript = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const majors = ${stringifyData(majors)};
const sections = ${stringifyData(sections)};
const users = ${stringifyData(users)};
const subjects = ${stringifyData(subjects)};
const subjectTeachers = ${stringifyData(subjectTeachers)};
const keys = ${stringifyData(keys)};
const schedules = ${stringifyData(schedules)};
const borrowReasons = ${stringifyData(borrowReasons)};
const penaltyConfigs = ${stringifyData(penaltyConfigs)};
const bookings = ${stringifyData(bookings)};
const penaltyLogs = ${stringifyData(penaltyLogs)};
const dailyAuthorizations = ${stringifyData(dailyAuthorizations)};
const systemLogs = ${stringifyData(systemLogs)};

async function main() {
  console.log('🌱 Start seeding...');

  try {
    if (majors.length > 0) {
      await prisma.major.createMany({ data: majors, skipDuplicates: true });
      console.log('✅ Majors seeded');
    }
  } catch (e) { console.error('Error seeding majors'); }
  
  try {
    if (sections.length > 0) {
      await prisma.section.createMany({ data: sections, skipDuplicates: true });
      console.log('✅ Sections seeded');
    }
  } catch (e) { console.error('Error seeding sections'); }

  try {
    if (users.length > 0) {
      await prisma.user.createMany({ data: users, skipDuplicates: true });
      console.log('✅ Users seeded');
    }
  } catch (e) { console.error('Error seeding users'); }

  try {
    if (subjects.length > 0) {
      await prisma.subject.createMany({ data: subjects, skipDuplicates: true });
      console.log('✅ Subjects seeded');
    }
  } catch (e) { console.error('Error seeding subjects'); }

  try {
    if (subjectTeachers.length > 0) {
      await prisma.subjectTeacher.createMany({ data: subjectTeachers, skipDuplicates: true });
      console.log('✅ SubjectTeachers seeded');
    }
  } catch (e) { console.error('Error seeding subjectTeachers'); }

  try {
    if (keys.length > 0) {
      await prisma.key.createMany({ data: keys, skipDuplicates: true });
      console.log('✅ Keys seeded');
    }
  } catch (e) { console.error('Error seeding keys'); }

  try {
    if (schedules.length > 0) {
      await prisma.schedule.createMany({ data: schedules, skipDuplicates: true });
      console.log('✅ Schedules seeded');
    }
  } catch (e) { console.error('Error seeding schedules'); }

  try {
    if (borrowReasons.length > 0) {
      await prisma.borrowReason.createMany({ data: borrowReasons, skipDuplicates: true });
      console.log('✅ BorrowReasons seeded');
    }
  } catch (e) { console.error('Error seeding borrowReasons'); }

  try {
    if (penaltyConfigs.length > 0) {
      await prisma.penaltyConfig.createMany({ data: penaltyConfigs, skipDuplicates: true });
      console.log('✅ PenaltyConfigs seeded');
    }
  } catch (e) { console.error('Error seeding penaltyConfigs'); }
  
  try {
    if (dailyAuthorizations.length > 0) {
      await prisma.dailyAuthorization.createMany({ data: dailyAuthorizations, skipDuplicates: true });
      console.log('✅ DailyAuthorizations seeded');
    }
  } catch (e) { console.error('Error seeding dailyAuthorizations'); }

  try {
    if (bookings.length > 0) {
      await prisma.booking.createMany({ data: bookings, skipDuplicates: true });
      console.log('✅ Bookings seeded');
    }
  } catch (e) { console.error('Error seeding bookings'); }

  try {
    if (penaltyLogs.length > 0) {
      await prisma.penaltyLog.createMany({ data: penaltyLogs, skipDuplicates: true });
      console.log('✅ PenaltyLogs seeded');
    }
  } catch (e) { console.error('Error seeding penaltyLogs'); }

  try {
    if (systemLogs.length > 0) {
      await prisma.systemLog.createMany({ data: systemLogs, skipDuplicates: true });
      console.log('✅ SystemLogs seeded');
    }
  } catch (e) { console.error('Error seeding systemLogs'); }

  console.log('🎉 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  fs.writeFileSync('./prisma/seed.js', seedScript, 'utf8');
  console.log('✅ Done writing database state to prisma/seed.js');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
