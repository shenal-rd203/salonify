# Appointment availability

`GET /api/shops/{slug}/availability?date=2026-09-07&serviceId={id}&serviceId={another-id}`

Optionally add `staffId={id}`. Service IDs must belong to this shop. The response
contains `date`, `timeZone`, `durationMins`, `slotIntervalMins`, and `slots`.
Each slot has UTC ISO `startTime`, `endTime` (service end, excluding cleanup),
and the eligible `staffIds`. An empty slots array means no availability.
Invalid input returns 400, unknown shops 404, missing configuration or failures 503.
Responses are not cached and never expose customer or appointment details.

Optionally configure a server environment variable containing a JSON object of
shop slugs to IANA timezones. Shops missing from this mapping default to
`Asia/Colombo` (Sri Lanka time). For the San Francisco demo salon:

```dotenv
SHOP_TIME_ZONES='{"demo-salon":"America/Los_Angeles"}'
```

Use `Asia/Colombo` for a Sri Lankan salon. The server timezone is never used as a
fallback. A persisted per-shop setting can replace this mapping when the settings
UI is built. No schema migration is needed for this implementation.

## Scheduling rules

- Sum selected service durations; a single active staff member must offer all of them.
- A missing daily schedule means working; `isWorking: false` means off all day.
- Opening hours use the existing weekday JSON arrays. Missing/null days are closed.
  Split hours represent breaks. Overnight ranges must be split across calendar days.
  Closing at `24:00` is supported.
- Starts fall on a 15-minute grid anchored at each opening interval.
- Service time plus one cleanup buffer must fit in one opening interval.
- Non-cancelled appointments occupy their scheduled interval plus cleanup. Blocks
  have no trailing cleanup. Completed/no-show appointments conservatively retain
  their scheduled interval. Actual start/end fields do not change availability.
- Minimum notice is elapsed time from now, inclusive. Maximum advance is calendar
  days in the salon timezone, inclusive. Closed booking returns no slots.
- Real UTC minutes handle daylight-saving gaps and repeated times; clients should
  display times using the returned timezone, retaining the UTC value for selection.

The generator is a read-only snapshot, not a reservation. The future booking write
path must recheck availability and serialize competing bookings per staff inside
a database transaction before inserting. This endpoint alone cannot prevent two
customers from booking the same slot concurrently.

Run engine tests with `npx tsx --test src/lib/availability.test.ts`.
