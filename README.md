# Salonify

> A scheduling foundation for modern salons and barbershops.

Salonify is a salon appointment platform prototype designed to make service
availability predictable for both customers and staff. It models shops,
services, staff capabilities, customers, schedules, and appointments in one
consistent system, then calculates bookable time slots using the salon's
business rules.

This project demonstrates practical full-stack engineering around a problem
that looks simple on the surface but quickly becomes complex in production:
time zones, split opening hours, staff specialization, appointment buffers,
daily exceptions, cancellations, and overlapping bookings.

## Product highlights

- **Salon-aware scheduling** — Configure opening hours, booking windows,
  minimum notice, maximum advance days, and cleanup buffers per shop.
- **Staff and service matching** — Only return slots for staff members who can
  perform every selected service.
- **Reliable availability calculations** — Account for existing appointments,
  blocked time, split shifts, breaks, daily schedules, and cancellation rules.
- **Timezone-safe booking slots** — Generate slots in the salon's IANA timezone
  while returning UTC timestamps for reliable client-side selection.
- **Multi-service appointments** — The data model supports combining services
  in a single appointment.
- **Privacy-conscious API** — The availability endpoint returns slot metadata,
  not customer or appointment details.
- **Seeded demo experience** — A sample salon, staff, services, customers, and
  appointments can be created for local development.

## Demo domain

The seed script creates **Luxe Cuts & Salon**, a San Francisco demo shop with:

- Marco Rossi, a barber specializing in men's haircuts and beard trims
- Elena Rossi, a stylist specializing in wash/blow-dry and coloring
- Split weekday and Saturday opening hours
- Appointment buffer and advance-booking rules
- Existing appointments for testing collision detection

## Architecture

| Area | Implementation |
| --- | --- |
| Application | Next.js App Router 16 |
| UI | React 19 and Tailwind CSS 4 |
| API | Next.js route handlers |
| Data layer | Prisma ORM |
| Database | PostgreSQL |
| Language | TypeScript |
| Testing | Node's test runner with `tsx` |

### Availability API

```text
GET /api/shops/{slug}/availability
  ?date=2026-09-07
  &serviceId={id}
  &serviceId={another-id}
  &staffId={optional-id}
```

The endpoint returns the requested date, salon timezone, total service
duration, slot interval, and available slots. Each slot contains UTC
`startTime` and `endTime` values plus the eligible staff IDs.

Important scheduling rules include:

- 15-minute slot grids anchored to each opening interval
- Service duration plus cleanup buffer must fit inside the interval
- Non-cancelled appointments reserve their scheduled time and cleanup buffer
- Blocks reserve time without a cleanup buffer
- Minimum notice and maximum advance windows are enforced
- Missing daily schedules mean staff are working; explicit days off are closed
- Daylight-saving gaps and repeated times are handled using real UTC minutes

See [`docs/availability.md`](docs/availability.md) for the complete API
contract and scheduling behavior.

## Run locally

### Prerequisites

- Node.js 20+
- PostgreSQL
- A `DATABASE_URL` pointing to the application database
- A `DIRECT_URL` for Prisma direct database access

### Setup

```bash
npm install
npx prisma generate
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For the demo salon, configure its timezone when needed:

```dotenv
SHOP_TIME_ZONES='{"demo-salon":"America/Los_Angeles"}'
```

Shops not included in this mapping default to `Asia/Colombo`.

## Useful commands

```bash
npm run dev                 # Start the development server
npm run build               # Create a production build
npm run start               # Serve the production build
npm run lint                # Run ESLint
npm run seed                # Reset and seed demo salon data
npx tsx --test src/lib/availability.test.ts
                            # Run availability engine tests
```

## Engineering notes

The availability endpoint is intentionally a read-only snapshot, not a
reservation. A production booking write path should recheck availability and
serialize competing bookings per staff inside a database transaction before
creating an appointment.

The project is currently focused on the scheduling engine and API foundation.
Customer booking UI, authentication, and appointment-management workflows are
natural next product surfaces.

## Why this project

Salonify is a project built around a real operational workflow rather
than a generic CRUD demo. It shows how to translate business constraints into
testable domain logic, expose a focused API, model relational data, and make
time-based behavior explicit and reliable.
