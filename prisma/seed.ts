import { PrismaClient, PeriodType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@billboard.local' },
    update: {},
    create: {
      email: 'admin@billboard.local',
      name: 'Admin User',
      phone: '+919999999999',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create plans
  const plans = [
    {
      name: '50 Plays/Day',
      playsPerDay: 50,
      price: 5000,
      periodType: PeriodType.FULL_DAY,
      description: 'Perfect for small businesses starting with advertising',
    },
    {
      name: '100 Plays/Day',
      playsPerDay: 100,
      price: 8000,
      periodType: PeriodType.FULL_DAY,
      description: 'Ideal for growing businesses',
    },
    {
      name: '240 Plays/Day',
      playsPerDay: 240,
      price: 15000,
      periodType: PeriodType.FULL_DAY,
      description: 'Popular choice for medium businesses',
    },
    {
      name: '400 Plays/Day',
      playsPerDay: 400,
      price: 22000,
      periodType: PeriodType.FULL_DAY,
      description: 'Excellent visibility for premium brands',
    },
    {
      name: '600 Plays/Day',
      playsPerDay: 600,
      price: 30000,
      periodType: PeriodType.FULL_DAY,
      description: 'High impact advertising solution',
    },
    {
      name: '900 Plays/Day',
      playsPerDay: 900,
      price: 40000,
      periodType: PeriodType.FULL_DAY,
      description: 'Maximum visibility and coverage',
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }
  console.log('✅ Plans created:', plans.length);

  // Create addons
  const addons = [
    {
      name: 'On-Demand Refresh',
      price: 2000,
      description: 'Refresh your ad immediately without waiting for the next slot',
    },
    {
      name: 'Premium Slot Priority',
      price: 3000,
      description: 'Get priority for premium time slots (Peak hours)',
    },
    {
      name: 'Extra Proof-of-Play Report',
      price: 1500,
      description: 'Detailed analytics and proof of advertisement playback',
    },
  ];

  for (const addon of addons) {
    await prisma.addon.upsert({
      where: { name: addon.name },
      update: {},
      create: addon,
    });
  }
  console.log('✅ Addons created:', addons.length);

  // Generate slots for the next 30 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const slots = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    // Day slots: 8 AM to 5 PM (10-minute intervals)
    let slotStart = new Date(current);
    slotStart.setHours(8, 0, 0, 0);

    while (slotStart.getHours() < 17) {
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 10);

      slots.push({
        date: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
        startTime: slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        endTime: slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        periodType: PeriodType.DAY,
        maxCapacity: 1,
        bookedCapacity: 0,
        isBlocked: false,
      });

      slotStart = slotEnd;
    }

    // Night slots: 5 PM to 10 PM (10-minute intervals)
    slotStart = new Date(current);
    slotStart.setHours(17, 0, 0, 0);

    while (slotStart.getHours() < 22) {
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 10);

      slots.push({
        date: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
        startTime: slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        endTime: slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        periodType: PeriodType.NIGHT,
        maxCapacity: 1,
        bookedCapacity: 0,
        isBlocked: false,
      });

      slotStart = slotEnd;
    }

    current.setDate(current.getDate() + 1);
  }

  await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true,
  });
  console.log('✅ Slots created:', slots.length);

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
