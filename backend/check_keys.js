import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const keys = await prisma.key.findMany({
    take: 10,
    select: { id: true, roomCode: true, slotNumber: true, nfcUid: true }
  });
  console.log('--- DATABASE KEYS ---');
  console.log(JSON.stringify(keys, null, 2));
  console.log('---------------------');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
