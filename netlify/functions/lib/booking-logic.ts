/**
 * Ported unchanged from functions/src/booking-logic.ts (the retired Firebase
 * Cloud Functions implementation) — pure functions, no platform dependency,
 * so the migration to Netlify Functions doesn't touch any of the actual
 * booking-window/slot math.
 */

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Hours {
  m1: string;
  m2: string;
  e1: string;
  e2: string;
}

export interface BlockedRange {
  id: string;
  date: string;
  s: string;
  e: string;
}

export interface AvailabilityConfig {
  hours: Hours;
  slotMin: number;
  bookingDays: number;
  blockedDays: string[];
  blockedRanges: BlockedRange[];
}

export interface SessionDef {
  label: string;
  s: string;
  e: string;
}

export interface SlotSession {
  label: string;
  slots: string[];
}

export interface WindowDay {
  iso: string;
  dow: string;
  dnum: number;
  mon: string;
  closed: boolean;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function minsOf(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function hhmm(totalMins: number): string {
  return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
}

export function formatTime(t: string): string {
  const m = minsOf(t);
  const h = Math.floor(m / 60);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${ap}`;
}

/** Clamped exactly like the prototype's windowDays(): `Math.max(2, Math.min(14, n || 7))`. */
export function clampBookingDays(n: number | undefined): number {
  return Math.max(2, Math.min(14, n || 7));
}

/** Ported from window7(): the rolling booking window starting "today" (clinic-local). */
export function windowDays(todayIso: string, bookingDays: number): WindowDay[] {
  const base = parseIso(todayIso);
  const out: WindowDay[] = [];
  for (let i = 0; i < bookingDays; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      iso: isoOf(d),
      dow: i === 0 ? 'Today' : DOW_SHORT[d.getDay()],
      dnum: d.getDate(),
      mon: MON_SHORT[d.getMonth()],
      closed: d.getDay() === 0,
    });
  }
  return out;
}

/** Ported from sessions(): two fixed sessions a day, morning and evening. */
export function sessionsOf(hours: Hours): SessionDef[] {
  return [
    { label: 'Morning', s: hours.m1, e: hours.m2 },
    { label: 'Evening', s: hours.e1, e: hours.e2 },
  ];
}

/**
 * Ported from slotsFor(iso, doctorId): excludes Sundays, blocked days,
 * already-booked times, blocked ranges, and — for today — times at or
 * before the current clinic-local minute.
 */
export function slotsFor(params: {
  iso: string;
  config: AvailabilityConfig;
  bookedTimes: string[];
  todayIso: string;
  nowMinutes: number;
}): SlotSession[] {
  const { iso, config, bookedTimes, todayIso, nowMinutes } = params;
  const d = parseIso(iso);
  if (d.getDay() === 0) return [];
  if (config.blockedDays.includes(iso)) return [];

  const step = config.slotMin;
  const isToday = iso === todayIso;
  const ranges = config.blockedRanges.filter((b) => b.date === iso);
  const out: SlotSession[] = [];

  for (const sess of sessionsOf(config.hours)) {
    const s = minsOf(sess.s);
    const e = minsOf(sess.e);
    const list: string[] = [];
    for (let m = s; m + step <= e; m += step) {
      const t = hhmm(m);
      if (isToday && m <= nowMinutes) continue;
      if (bookedTimes.includes(t)) continue;
      if (ranges.some((b) => m >= minsOf(b.s) && m < minsOf(b.e))) continue;
      list.push(t);
    }
    if (list.length) {
      out.push({ label: `${sess.label} · ${formatTime(sess.s)} – ${formatTime(sess.e)}`, slots: list });
    }
  }
  return out;
}
