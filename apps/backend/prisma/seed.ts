// apps/backend/prisma/seed.ts
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Groups
  const platform = await prisma.group.upsert({
    where: { name: 'platform' },
    update: {},
    create: { name: 'platform' },
  });

  const support = await prisma.group.upsert({
    where: { name: 'support' },
    update: {},
    create: { name: 'support' },
  });

  const sales = await prisma.group.upsert({
    where: { name: 'sales' },
    update: {},
    create: { name: 'sales' },
  });

  // 2. Hash the default password
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Users
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      groups: { connect: [{ id: platform.id }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      passwordHash,
      role: 'MANAGER',
      groups: { connect: [{ id: support.id }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash,
      role: 'USER',
      groups: { connect: [{ id: support.id }, { id: sales.id }] },
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
