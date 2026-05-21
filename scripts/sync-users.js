#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Syncing users...\n');

  const updates = [
    { email: 'haroonusman046@gmail.com', role: 'MANAGER' },
    { email: 'syedusmanharooni@gmail.com', role: 'ADMIN' },
    { email: 'fshaik@gmail.com', role: 'SUPER_ADMIN' },
  ];

  for (const u of updates) {
    const user = await prisma.user.findUnique({ where: { email: u.email } });
    if (user) {
      await prisma.user.update({ where: { email: u.email }, data: { role: u.role } });
      console.log(`✅ ${u.email} → ${u.role}`);
    } else {
      console.log(`⚠️  ${u.email} not found — skipping`);
    }
  }

  // Fix user@billboard.local — hash the password if it's stored as plaintext
  const testUser = await prisma.user.findUnique({ where: { email: 'user@billboard.local' } });
  if (testUser) {
    const isHashed = testUser.passwordHash.startsWith('$2b$');
    if (!isHashed) {
      const hashed = await bcrypt.hash(testUser.passwordHash, 10);
      await prisma.user.update({
        where: { email: 'user@billboard.local' },
        data: { passwordHash: hashed, role: 'USER' },
      });
      console.log(`✅ user@billboard.local — password hashed + role set to USER`);
    } else {
      await prisma.user.update({ where: { email: 'user@billboard.local' }, data: { role: 'USER' } });
      console.log(`✅ user@billboard.local → USER`);
    }
  } else {
    // Create if not exists
    const hashed = await bcrypt.hash('773883@admin', 10);
    await prisma.user.create({
      data: {
        email: 'user@billboard.local',
        name: 'usertest',
        passwordHash: hashed,
        role: 'USER',
        isActive: true,
      },
    });
    console.log(`✅ user@billboard.local created with role USER`);
  }

  console.log('\n✅ Done!');
}

main()
  .catch(e => { console.error('❌ Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
