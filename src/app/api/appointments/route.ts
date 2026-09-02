import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    const appointments = await prisma.appointment.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { scheduledStart: 'asc' },
      include: {
        customer: true,
        barber: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Expected payload: shopId, barberId, customerId, serviceIds, scheduledStart, scheduledEnd
    
    const appointment = await prisma.appointment.create({
      data: {
        shopId: body.shopId,
        barberId: body.barberId,
        customerId: body.customerId,
        serviceIds: body.serviceIds,
        scheduledStart: new Date(body.scheduledStart),
        scheduledEnd: new Date(body.scheduledEnd),
        status: body.status || 'BOOKED',
      },
      include: {
        customer: true,
        barber: true,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
