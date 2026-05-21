#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all data...\n');

  await prisma.auditLog.deleteMany({});
  console.log('✅ AuditLogs cleared');

  await prisma.payment.deleteMany({});
  console.log('✅ Payments cleared');

  await prisma.campaignAddon.deleteMany({});
  console.log('✅ CampaignAddons cleared');

  await prisma.schedule.deleteMany({});
  console.log('✅ Schedules cleared');

  await prisma.booking.deleteMany({}).catch(() => {});
  console.log('✅ Bookings cleared');

  await prisma.campaign.deleteMany({});
  console.log('✅ Campaigns cleared');

  await prisma.media.deleteMany({});
  console.log('✅ Media cleared');

  const deleted = await prisma.user.deleteMany({});
  console.log(`✅ Users deleted: ${deleted.count}`);

  console.log('\n✅ Done! DB is clean.');
}

main()
  .catch(e => { console.error('❌ Failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
