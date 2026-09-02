import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, name } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });
    }

    // Upsert customer by phone number
    const customer = await prisma.customer.upsert({
      where: { phoneNumber },
      update: { name: name || undefined }, // Update name if provided
      create: { 
        phoneNumber, 
        name: name || 'Guest'
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error upserting customer:', error);
    return NextResponse.json({ error: 'Failed to upsert customer' }, { status: 500 });
  }
}
