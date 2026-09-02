import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    const walkIns = await prisma.walkInQueue.findMany({
      where: shopId ? { shopId } : undefined,
      orderBy: { joinedAt: 'asc' },
      include: {
        customer: true,
        barber: true,
      },
    });

    return NextResponse.json(walkIns);
  } catch (error) {
    console.error('Error fetching walk-ins:', error);
    return NextResponse.json({ error: 'Failed to fetch walk-ins' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Expected payload: shopId, customerId, serviceIds, totalEstDuration, barberId (optional)
    
    const walkIn = await prisma.walkInQueue.create({
      data: {
        shopId: body.shopId,
        customerId: body.customerId,
        serviceIds: body.serviceIds,
        totalEstDuration: body.totalEstDuration,
        barberId: body.barberId || null,
        status: 'WAITING',
      },
      include: {
        customer: true,
        barber: true,
      },
    });

    return NextResponse.json(walkIn, { status: 201 });
  } catch (error) {
    console.error('Error creating walk-in:', error);
    return NextResponse.json({ error: 'Failed to create walk-in' }, { status: 500 });
  }
}
