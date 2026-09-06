const MINUTE = 60_000;
const DAY = 86_400_000;
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export class AvailabilityInputError extends Error {}

export type AvailabilityInput = {
  date: string;
  timeZone: string;
  serviceIds: string[];
  staffId?: string;
  now?: Date;
  slotIntervalMins?: number;
  settings: {
    isBookingOpen: boolean;
    minNoticeHours: number;
    maxAdvanceDays: number;
    bufferMins: number;
    operatingHours: unknown;
  };
  services: { id: string; durationMins: number }[];
  staff: { id: string; isActive: boolean; serviceIds: string[]; isWorking?: boolean }[];
  appointments: { staffId: string; startTime: Date; endTime: Date; status: string }[];
};

export function validateDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date) {
    throw new AvailabilityInputError('date must be a valid YYYY-MM-DD date');
  }
}

// Broad UTC bounds include the entire local date in every supported IANA zone.
export function dateBounds(date: string) {
  validateDate(date);
  const midnight = Date.parse(date);
  return { start: new Date(midnight - 14 * 60 * MINUTE), end: new Date(midnight + 36 * 60 * MINUTE) };
}

function integer(value: number, minimum: number) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error('Invalid scheduling configuration');
}

function hoursForDate(value: unknown, date: string): { open: number; close: number }[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid operating hours');
  const day = (value as Record<string, unknown>)[weekdays[new Date(date).getUTCDay()]];
  if (day === null || day === undefined) return [];
  if (!Array.isArray(day)) throw new Error('Invalid operating hours');
  const parse = (time: unknown, closing: boolean) => {
    if (closing && time === '24:00') return 1440;
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid operating hours');
    return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  };
  const ranges = day.map((range: unknown) => {
    if (!range || typeof range !== 'object') throw new Error('Invalid operating hours');
    const item = range as Record<string, unknown>;
    const open = parse(item.open, false), close = parse(item.close, true);
    if (close <= open) throw new Error('Operating hours must end on the same day');
    return { open, close };
  }).sort((a, b) => a.open - b.open);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].open < ranges[i - 1].close) throw new Error('Operating hours overlap');
  }
  return ranges;
}

export function generateAvailability(input: AvailabilityInput) {
  const { date, settings, timeZone } = input;
  const bounds = dateBounds(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const local = (timestamp: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  };
  const now = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(now)) throw new Error('Invalid current time');
  const interval = input.slotIntervalMins ?? 15;
  integer(interval, 1);
  integer(settings.bufferMins, 0);
  integer(settings.minNoticeHours, 0);
  integer(settings.maxAdvanceDays, 0);
  if (!input.serviceIds.length || new Set(input.serviceIds).size !== input.serviceIds.length) {
    throw new AvailabilityInputError('Select one or more distinct services');
  }
  let durationMins = 0;
  for (const id of input.serviceIds) {
    const service = input.services.find(s => s.id === id);
    if (!service) throw new AvailabilityInputError('Unknown service for this shop');
    integer(service.durationMins, 1);
    durationMins += service.durationMins;
  }
  const slots: { startTime: string; endTime: string; staffIds: string[] }[] = [];
  const result = { date, timeZone, durationMins, slotIntervalMins: interval, slots };
  const daysAhead = (Date.parse(date) - Date.parse(local(now).date)) / DAY;
  const ranges = hoursForDate(settings.operatingHours, date);
  if (!settings.isBookingOpen || daysAhead < 0 || daysAhead > settings.maxAdvanceDays) return result;
  const staff = input.staff.filter(s => s.isActive && s.isWorking !== false &&
    (!input.staffId || s.id === input.staffId) && input.serviceIds.every(id => s.serviceIds.includes(id)));
  if (!staff.length || !ranges.length) return result;
  const buffer = settings.bufferMins * MINUTE;
  const busy = new Map<string, { start: number; end: number }[]>();
  for (const appointment of input.appointments) {
    if (appointment.status === 'CANCELLED') continue;
    const start = appointment.startTime.getTime(), end = appointment.endTime.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Invalid appointment interval');
    const blocks = busy.get(appointment.staffId) ?? [];
    blocks.push({ start, end: end + (appointment.status === 'BLOCKED' ? 0 : buffer) });
    busy.set(appointment.staffId, blocks);
  }

  // Walk real minutes, preserving both occurrences of repeated DST times and
  // never inventing local times skipped by a daylight-saving transition.
  const minutes: { timestamp: number; minute: number; range: number }[] = [];
  for (let timestamp = bounds.start.getTime(); timestamp < bounds.end.getTime(); timestamp += MINUTE) {
    const wall = local(timestamp);
    const range = wall.date === date ? ranges.findIndex(r => wall.minute >= r.open && wall.minute < r.close) : -1;
    minutes.push({ timestamp, minute: wall.minute, range });
  }
  // Suffix lengths make containment checks constant time per candidate.
  const remaining = new Array<number>(minutes.length).fill(0);
  for (let i = minutes.length - 1; i >= 0; i--) {
    if (minutes[i].range >= 0) remaining[i] = 1 + (minutes[i + 1]?.range === minutes[i].range ? remaining[i + 1] : 0);
  }
  for (let i = 0; i < minutes.length; i++) {
    const { timestamp: start, minute, range } = minutes[i];
    if (range < 0 || (minute - ranges[range].open) % interval !== 0 ||
        start < now + settings.minNoticeHours * 60 * MINUTE ||
        remaining[i] < durationMins + settings.bufferMins) continue;
    const end = start + durationMins * MINUTE;
    const staffIds = staff.filter(s => !(busy.get(s.id) ?? []).some(b => start < b.end && end + buffer > b.start)).map(s => s.id);
    if (staffIds.length) slots.push({ startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), staffIds });
  }
  return result;
}
