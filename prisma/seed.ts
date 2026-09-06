import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with pilot salon data...');

  const shopSlug = 'demo-salon';

  // Clean up previous demo shop data if it exists (cascades to related tables)
  const existingShop = await prisma.shop.findUnique({
    where: { slug: shopSlug },
  });

  if (existingShop) {
    console.log('🧹 Cleaning up previous demo shop data...');
    await prisma.shop.delete({
      where: { id: existingShop.id },
    });
  }

  // 1. Create Pilot Shop
  const shop = await prisma.shop.create({
    data: {
      slug: shopSlug,
      name: 'Luxe Cuts & Salon',
      phoneNumber: '+1 (555) 234-5678',
      address: '124 Market Street, Downtown, San Francisco, CA',
      whatsappApiId: 'wa_demo_luxecuts',
    },
  });
  console.log(`✅ Created Shop: ${shop.name} (${shop.slug})`);

  // 2. Create Shop Settings (Split operating hours with 10 min buffer)
  const shopSettings = await prisma.shopSettings.create({
    data: {
      shopId: shop.id,
      minNoticeHours: 1,
      maxAdvanceDays: 14,
      bufferMins: 10,
      isBookingOpen: true,
      operatingHours: {
        monday: [
          { open: '09:00', close: '13:00' },
          { open: '14:00', close: '19:00' },
        ],
        tuesday: [
          { open: '09:00', close: '13:00' },
          { open: '14:00', close: '19:00' },
        ],
        wednesday: [
          { open: '09:00', close: '13:00' },
          { open: '14:00', close: '19:00' },
        ],
        thursday: [
          { open: '09:00', close: '13:00' },
          { open: '14:00', close: '19:00' },
        ],
        friday: [
          { open: '09:00', close: '13:00' },
          { open: '14:00', close: '19:00' },
        ],
        saturday: [
          { open: '10:00', close: '14:00' },
          { open: '15:00', close: '18:00' },
        ],
        sunday: null, // Closed on Sundays
      },
    },
  });
  console.log(`✅ Created Shop Settings (buffer: ${shopSettings.bufferMins} mins, notice: ${shopSettings.minNoticeHours}h)`);

  // 3. Create 2 Staff (Husband & Wife)
  const husband = await prisma.staff.create({
    data: {
      shopId: shop.id,
      name: 'Marco Rossi', // Husband (Barber / Gents specialist)
      isActive: true,
    },
  });

  const wife = await prisma.staff.create({
    data: {
      shopId: shop.id,
      name: 'Elena Rossi', // Wife (Stylist / Ladies specialist)
      isActive: true,
    },
  });
  console.log(`✅ Created Staff: ${husband.name} & ${wife.name}`);

  // 4. Create Services
  const mensHaircut = await prisma.service.create({
    data: {
      shopId: shop.id,
      name: "Men's Classic Haircut",
      durationMins: 30,
      price: 35.0,
    },
  });

  const beardTrim = await prisma.service.create({
    data: {
      shopId: shop.id,
      name: 'Beard Trim & Hot Towel',
      durationMins: 20,
      price: 25.0,
    },
  });

  const womensWashBlowdry = await prisma.service.create({
    data: {
      shopId: shop.id,
      name: "Women's Wash & Blowdry",
      durationMins: 45,
      price: 60.0,
    },
  });

  const hairColoring = await prisma.service.create({
    data: {
      shopId: shop.id,
      name: 'Full Hair Coloring & Styling',
      durationMins: 90,
      price: 130.0,
    },
  });
  console.log(`✅ Created 4 Services: 2 Gents & 2 Ladies services`);

  // 5. Link Staff to Services (Gents -> Marco, Ladies -> Elena)
  await prisma.staffService.createMany({
    data: [
      { staffId: husband.id, serviceId: mensHaircut.id },
      { staffId: husband.id, serviceId: beardTrim.id },
      { staffId: wife.id, serviceId: womensWashBlowdry.id },
      { staffId: wife.id, serviceId: hairColoring.id },
    ],
  });
  console.log(`✅ Mapped StaffService relations`);

  // 6. Create Customers
  const customerJohn = await prisma.customer.upsert({
    where: { phoneNumber: '+1 (555) 987-6541' },
    update: { name: 'John Miller' },
    create: {
      phoneNumber: '+1 (555) 987-6541',
      name: 'John Miller',
      noShowStrikes: 0,
    },
  });

  const customerSarah = await prisma.customer.upsert({
    where: { phoneNumber: '+1 (555) 987-6542' },
    update: { name: 'Sarah Jenkins' },
    create: {
      phoneNumber: '+1 (555) 987-6542',
      name: 'Sarah Jenkins',
      noShowStrikes: 0,
    },
  });
  console.log(`✅ Created/Upserted Customers: ${customerJohn.name}, ${customerSarah.name}`);

  // 7. Create Daily Schedules for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyStaffSchedule.createMany({
    data: [
      { staffId: husband.id, date: today, isWorking: true },
      { staffId: wife.id, date: today, isWorking: true },
    ],
    skipDuplicates: true,
  });

  // 8. Create 2 dummy Appointments today to test collision detection
  const todayDateStr = today.toISOString().split('T')[0];

  // Appointment 1: Marco (Husband) - 10:00 to 10:30 (Men's Haircut)
  const appt1Start = new Date(`${todayDateStr}T10:00:00.000Z`);
  const appt1End = new Date(`${todayDateStr}T10:30:00.000Z`);

  const appointment1 = await prisma.appointment.create({
    data: {
      shopId: shop.id,
      staffId: husband.id,
      customerId: customerJohn.id,
      clientName: customerJohn.name,
      startTime: appt1Start,
      endTime: appt1End,
      status: AppointmentStatus.BOOKED,
      services: {
        create: [{ serviceId: mensHaircut.id }],
      },
    },
  });

  // Appointment 2: Elena (Wife) - 11:00 to 11:45 (Wash & Blowdry)
  const appt2Start = new Date(`${todayDateStr}T11:00:00.000Z`);
  const appt2End = new Date(`${todayDateStr}T11:45:00.000Z`);

  const appointment2 = await prisma.appointment.create({
    data: {
      shopId: shop.id,
      staffId: wife.id,
      customerId: customerSarah.id,
      clientName: customerSarah.name,
      startTime: appt2Start,
      endTime: appt2End,
      status: AppointmentStatus.BOOKED,
      services: {
        create: [{ serviceId: womensWashBlowdry.id }],
      },
    },
  });

  console.log(`✅ Created 2 Dummy Appointments for today:`);
  console.log(`   - ${appointment1.id}: Marco Rossi @ 10:00-10:30 (${customerJohn.name})`);
  console.log(`   - ${appointment2.id}: Elena Rossi @ 11:00-11:45 (${customerSarah.name})`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
