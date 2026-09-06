import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAvailability, type AvailabilityInput } from './availability';

function fixture(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    date: '2026-09-07', timeZone: 'UTC', now: new Date('2026-09-06T00:00:00Z'),
    serviceIds: ['cut'], settings: {
      isBookingOpen: true, minNoticeHours: 1, maxAdvanceDays: 14, bufferMins: 10,
      operatingHours: { monday: [{ open: '09:00', close: '10:00' }, { open: '11:00', close: '12:00' }] },
    },
    services: [{ id: 'cut', durationMins: 30 }, { id: 'wash', durationMins: 15 }],
    staff: [{ id: 'a', isActive: true, serviceIds: ['cut', 'wash'] }, { id: 'b', isActive: true, serviceIds: ['cut'] }],
    appointments: [], ...overrides,
  };
}
const times = (input: AvailabilityInput) => generateAvailability(input).slots.map(s => s.startTime.slice(11, 16));

test('split hours and cleanup fit entirely before closing', () => {
  assert.deepEqual(times(fixture()), ['09:00', '09:15', '11:00', '11:15']);
});
test('all services must be performed by the same eligible working staff member', () => {
  const result = generateAvailability(fixture({ serviceIds: ['cut', 'wash'] }));
  assert.equal(result.durationMins, 45);
  assert.deepEqual(result.slots.map(s => s.staffIds), [['a'], ['a']]);
  assert.equal(generateAvailability(fixture({ staff: [{ id: 'a', isActive: true, isWorking: false, serviceIds: ['cut'] }] })).slots.length, 0);
  assert.equal(generateAvailability(fixture({ staffId: 'foreign' })).slots.length, 0);
});
test('overlaps are per staff; buffers apply on both sides with exact boundaries allowed', () => {
  const input = fixture({ appointments: [{ staffId: 'a', startTime: new Date('2026-09-07T09:40Z'), endTime: new Date('2026-09-07T10:50Z'), status: 'BOOKED' }] });
  const slots = generateAvailability(input).slots;
  assert.deepEqual(slots[0].staffIds, ['a', 'b']);
  assert.deepEqual(slots[1].staffIds, ['b']);
  assert.deepEqual(slots[2].staffIds, ['a', 'b']);
});
test('cancelled appointments release time; blocked time prevents bookings', () => {
  const appointment = { staffId: 'a', startTime: new Date('2026-09-07T08:00Z'), endTime: new Date('2026-09-07T12:00Z'), status: 'CANCELLED' };
  assert.equal(times(fixture({ staffId: 'a', appointments: [appointment] })).length, 4);
  assert.equal(times(fixture({ staffId: 'a', appointments: [{ ...appointment, status: 'BLOCKED' }] })).length, 0);
});
test('notice uses current instant and horizon uses shop calendar date', () => {
  assert.deepEqual(times(fixture({ now: new Date('2026-09-07T08:15:00Z') })), ['09:15', '11:00', '11:15']);
  assert.equal(times(fixture({ now: new Date('2026-08-23T00:00Z') })).length, 0);
  assert.equal(times(fixture({ now: new Date('2026-09-08T00:00Z') })).length, 0);
  const input = fixture();
  assert.equal(times({ ...input, settings: { ...input.settings, isBookingOpen: false } }).length, 0);
});
test('validates impossible dates, duplicate services, and unknown services', () => {
  for (const overrides of [{ date: '2026-02-30' }, { serviceIds: [] }, { serviceIds: ['cut', 'cut'] }, { serviceIds: ['foreign'] }]) {
    assert.throws(() => generateAvailability(fixture(overrides)));
  }
});
test('converts Sri Lanka local hours to UTC independently of server timezone', () => {
  const result = generateAvailability(fixture({ timeZone: 'Asia/Colombo' }));
  assert.equal(result.slots[0].startTime, '2026-09-07T03:30:00.000Z');
});
test('DST skips nonexistent times and preserves distinct repeated times', () => {
  const input = fixture();
  const settings = { ...input.settings, bufferMins: 0, operatingHours: { sunday: [{ open: '01:00', close: '04:00' }] } };
  const spring = generateAvailability(fixture({ date: '2026-03-08', now: new Date('2026-03-07T00:00Z'), timeZone: 'America/New_York', settings }));
  assert.equal(spring.slots.length, 7);
  const fall = generateAvailability(fixture({ date: '2026-11-01', now: new Date('2026-10-31T00:00Z'), timeZone: 'America/New_York', settings }));
  assert.equal(fall.slots.length, 15);
  assert.ok(fall.slots.some(s => s.startTime === '2026-11-01T05:00:00.000Z'));
  assert.ok(fall.slots.some(s => s.startTime === '2026-11-01T06:00:00.000Z'));
});
