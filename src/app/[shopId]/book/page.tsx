import { prisma } from '@/lib/prisma';
import { BookingFlow } from './BookingFlow';
import { notFound } from 'next/navigation';

interface BookPageProps {
  params: Promise<{ shopId: string }>;
}

export default async function BookPage({ params }: BookPageProps) {
  const { shopId } = await params;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      barbers: {
        where: { isActive: true },
        select: { id: true, name: true }
      },
      services: {
        select: { id: true, name: true, durationMins: true },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (!shop) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-12 pb-24">
      <BookingFlow 
        shopId={shop.id}
        shopName={shop.name}
        barbers={shop.barbers}
        services={shop.services}
      />
    </main>
  );
}
