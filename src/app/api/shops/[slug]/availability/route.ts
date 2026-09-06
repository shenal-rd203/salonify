import { AvailabilityInputError, dateBounds, generateAvailability } from '@/lib/availability';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const query = new URL(request.url).searchParams;
    const date = query.get('date') ?? '';
    const bounds = dateBounds(date);
    const serviceIds = query.getAll('serviceId');
    const staffId = query.get('staffId') ?? undefined;
    if (!serviceIds.length || serviceIds.length > 20 || serviceIds.some(id => !id || id.length > 100) ||
        new Set(serviceIds).size !== serviceIds.length || (staffId !== undefined && (!staffId || staffId.length > 100))) {
      throw new AvailabilityInputError('Provide 1–20 distinct serviceId parameters and an optional staffId');
    }
    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true, settings: true,
        services: { where: { id: { in: serviceIds } }, select: { id: true, durationMins: true } },
        staff: {
          where: { isActive: true, ...(staffId ? { id: staffId } : {}) },
          select: {
            id: true, isActive: true,
            services: { select: { serviceId: true } },
            dailySchedules: { where: { date: new Date(date) }, select: { isWorking: true } },
          },
        },
      },
    });
    if (!shop) return json({ error: 'Shop not found' }, 404);
    if (!shop.settings) return json({ error: 'Shop scheduling is not configured' }, 503);
    // Explicit per-shop configuration until timezone becomes a persisted setting.
    const zones: unknown = JSON.parse(process.env.SHOP_TIME_ZONES ?? '{}');
    const configuredTimeZone = zones && typeof zones === 'object' && !Array.isArray(zones)
      ? (zones as Record<string, unknown>)[slug] : undefined;
    // Sri Lanka is the product default. A shop can override it with an IANA
    // timezone in SHOP_TIME_ZONES without requiring a schema migration.
    const timeZone = typeof configuredTimeZone === 'string' && configuredTimeZone
      ? configuredTimeZone : 'Asia/Colombo';
    const appointments = await prisma.appointment.findMany({
      where: {
        shopId: shop.id, staffId: { in: shop.staff.map(s => s.id) },
        status: { not: 'CANCELLED' },
        startTime: { lt: bounds.end },
        endTime: { gt: new Date(bounds.start.getTime() - shop.settings.bufferMins * 60_000) },
      },
      select: { staffId: true, startTime: true, endTime: true, status: true },
    });
    return json(generateAvailability({
      date, timeZone, serviceIds, staffId, settings: shop.settings, services: shop.services,
      staff: shop.staff.map(s => ({
        id: s.id, isActive: s.isActive, serviceIds: s.services.map(service => service.serviceId),
        isWorking: s.dailySchedules[0]?.isWorking,
      })),
      appointments,
    }));
  } catch (error) {
    if (error instanceof AvailabilityInputError) return json({ error: error.message }, 400);
    console.error('Availability lookup failed', error);
    return json({ error: 'Availability is temporarily unavailable' }, 503);
  }
}
