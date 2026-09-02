import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    const barbers = await prisma.barber.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(barbers);
  } catch (error) {
    console.error('Error fetching barbers:', error);
    return NextResponse.json({ error: 'Failed to fetch barbers' }, { status: 500 });
  }
}
