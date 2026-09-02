import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Clean up existing data to avoid conflicts during repeated seeding
  await prisma.walkInQueue.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.shop.deleteMany();

  console.log('Database cleaned.');

  // 1. Create a Shop
  const shop = await prisma.shop.create({
    data: {
      name: 'The Sharp Fade Barbershop',
      subscriptionTier: 'HYBRID_PREMIUM',
      whatsappNumber: '+1234567890',
    },
  });
  console.log(`Created shop: ${shop.name} (${shop.id})`);

  // 2. Create 2 Barbers
  const barber1 = await prisma.barber.create({
    data: {
      name: 'James "Clipper" Smith',
      isActive: true,
      shopId: shop.id,
    },
  });

  const barber2 = await prisma.barber.create({
    data: {
      name: 'Michael Fade',
      isActive: true,
      shopId: shop.id,
    },
  });
  console.log(`Created barbers: ${barber1.name}, ${barber2.name}`);

  // 3. Create 5 Services
  const service1 = await prisma.service.create({
    data: { name: "Men's Haircut", durationMins: 30, shopId: shop.id },
  });
  const service2 = await prisma.service.create({
    data: { name: 'Beard Trim', durationMins: 15, shopId: shop.id },
  });
  const service3 = await prisma.service.create({
    data: { name: 'Haircut & Beard', durationMins: 45, shopId: shop.id },
  });
  const service4 = await prisma.service.create({
    data: { name: 'Kids Haircut', durationMins: 20, shopId: shop.id },
  });
  const service5 = await prisma.service.create({
    data: { name: 'Hot Towel Shave', durationMins: 30, shopId: shop.id },
  });
  console.log('Created 5 services.');

  // 4. Create Customers for the Walk-Ins
  const customer1 = await prisma.customer.create({
    data: { name: 'Alex Johnson', phoneNumber: '+15550001111' },
  });
  const customer2 = await prisma.customer.create({
    data: { name: 'Brian Miller', phoneNumber: '+15550002222' },
  });
  const customer3 = await prisma.customer.create({
    data: { name: 'Chris Davis', phoneNumber: '+15550003333' },
  });
  console.log('Created 3 customers.');

  // 5. Create 3 Dummy Walk-Ins
  // Walk-in 1: Alex waiting for Barber 1
  await prisma.walkInQueue.create({
    data: {
      shopId: shop.id,
      barberId: barber1.id,
      customerId: customer1.id,
      serviceIds: [service1.id],
      totalEstDuration: service1.durationMins,
      status: 'WAITING',
      joinedAt: new Date(Date.now() - 10 * 60000), // joined 10 mins ago
    },
  });

  // Walk-in 2: Brian in chair with Barber 2
  await prisma.walkInQueue.create({
    data: {
      shopId: shop.id,
      barberId: barber2.id,
      customerId: customer2.id,
      serviceIds: [service3.id],
      totalEstDuration: service3.durationMins,
      status: 'IN_CHAIR',
      joinedAt: new Date(Date.now() - 30 * 60000), // joined 30 mins ago
    },
  });

  // Walk-in 3: Chris waiting in Global Pool (Any Barber)
  await prisma.walkInQueue.create({
    data: {
      shopId: shop.id,
      // barberId is null for "Any Barber"
      customerId: customer3.id,
      serviceIds: [service1.id, service2.id],
      totalEstDuration: service1.durationMins + service2.durationMins,
      status: 'WAITING',
      joinedAt: new Date(Date.now() - 5 * 60000), // joined 5 mins ago
    },
  });

  console.log('Created 3 dummy walk-ins.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
