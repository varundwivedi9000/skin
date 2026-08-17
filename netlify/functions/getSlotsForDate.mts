import { Firestore } from 'firebase-admin/firestore';
import { getDb } from './lib/firebase-admin';
import { nowMinutesIST, todayIsoIST } from './lib/dates';
import { AvailabilityConfig, slotsFor } from './lib/booking-logic';
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

/** Returns the free session/slot groups for one doctor + date. Also unauthenticated, same reasoning as getBookingWindow. */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed.');
  try {
    const db = getDb();
    const body = await readJsonBody<{ doctorId?: unknown; date?: unknown }>(req);
    const doctorId = requireString(body.doctorId, 'doctorId');
    const date = requireString(body.date, 'date');
    const config = await loadConfig(db);
    const todayIso = todayIsoIST();
    const nowMinutes = nowMinutesIST();

    const apptsSnap = await db
      .collection('appointments')
      .where('doctorId', '==', doctorId)
      .where('date', '==', date)
      .get();
    const bookedTimes = apptsSnap.docs.map((doc) => (doc.data() as { time: string }).time);

    return json(slotsFor({ iso: date, config, bookedTimes, todayIso, nowMinutes }));
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    console.error('getSlotsForDate error', err);
    return errorResponse(500, 'Internal error.');
  }
};
