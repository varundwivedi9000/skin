import { Firestore } from 'firebase-admin/firestore';
import { getDb } from './lib/firebase-admin';
import { nowMinutesIST, todayIsoIST } from './lib/dates';
import { AvailabilityConfig, clampBookingDays, slotsFor, windowDays } from './lib/booking-logic';
import { HttpError, errorResponse, json, readJsonBody, requireString } from './lib/http';

const DEFAULT_CONFIG: AvailabilityConfig = {
  hours: { m1: '09:00', m2: '13:00', e1: '16:00', e2: '20:00' },
  slotMin: 30,
  bookingDays: 7,
  blockedDays: [],
  blockedRanges: [],
};

async function loadConfig(db: Firestore): Promise<AvailabilityConfig> {
  const snap = await db.doc('settings/availability').get();
  return snap.exists ? (snap.data() as AvailabilityConfig) : DEFAULT_CONFIG;
}

/**
 * Returns the rolling booking window (open/closed/full per day) for a
 * doctor. Patients call this unauthenticated — there are no patient
 * accounts — so it never returns raw appointment data, only day-level
 * availability flags. Ported from functions/src/index.ts's getBookingWindow.
 */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed.');
  try {
    const db = getDb();
    const body = await readJsonBody<{ doctorId?: unknown }>(req);
    const doctorId = requireString(body.doctorId, 'doctorId');
    const config = await loadConfig(db);
    const todayIso = todayIsoIST();
    const days = windowDays(todayIso, clampBookingDays(config.bookingDays));
    const nowMinutes = nowMinutesIST();

    const first = days[0].iso;
    const last = days[days.length - 1].iso;
    const apptsSnap = await db
      .collection('appointments')
      .where('doctorId', '==', doctorId)
      .where('date', '>=', first)
      .where('date', '<=', last)
      .get();

    const bookedByDate = new Map<string, string[]>();
    apptsSnap.forEach((doc) => {
      const a = doc.data() as { date: string; time: string };
      const list = bookedByDate.get(a.date) ?? [];
      list.push(a.time);
      bookedByDate.set(a.date, list);
    });

    const result = days.map((d) => {
      const blocked = config.blockedDays.includes(d.iso);
      const sessions =
        d.closed || blocked
          ? []
          : slotsFor({
              iso: d.iso,
              config,
              bookedTimes: bookedByDate.get(d.iso) ?? [],
              todayIso,
              nowMinutes,
            });
      const full = !d.closed && !blocked && sessions.length === 0;
      return { iso: d.iso, dow: d.dow, dnum: d.dnum, mon: d.mon, closed: d.closed, blocked, full };
    });

    return json(result);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    console.error('getBookingWindow error', err);
    return errorResponse(500, 'Internal error.');
  }
};
