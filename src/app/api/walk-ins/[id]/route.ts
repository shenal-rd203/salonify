import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const walkIn = await prisma.walkInQueue.findUnique({
      where: { id },
      include: {
        customer: true,
        barber: true,
      },
    });

    if (!walkIn) {
      return NextResponse.json({ error: 'Walk-in not found' }, { status: 404 });
    }

    return NextResponse.json(walkIn);
  } catch (error) {
    console.error('Error fetching walk-in:', error);
    return NextResponse.json({ error: 'Failed to fetch walk-in' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const walkIn = await prisma.walkInQueue.update({
      where: { id },
      data: {
        status: body.status,
        barberId: body.barberId,
      },
    });

    return NextResponse.json(walkIn);
  } catch (error) {
    console.error('Error updating walk-in:', error);
    return NextResponse.json({ error: 'Failed to update walk-in' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.walkInQueue.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting walk-in:', error);
    return NextResponse.json({ error: 'Failed to delete walk-in' }, { status: 500 });
  }
}
