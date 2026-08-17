import { Transaction } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
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

/**
 * Creates an appointment. Re-derives availability inside a transaction and
 * re-checks the requested slot is still free immediately before writing, so
 * two patients racing for the same slot can't both win it — the loser gets a
 * 409, and the client offers a "choose another time" retry. Ported from
 * functions/src/index.ts's createAppointment.
 */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed.');
  try {
    const data = await readJsonBody<Record<string, unknown>>(req);
    const doctorId = requireString(data['doctorId'], 'doctorId');
    const date = requireString(data['date'], 'date');
    const time = requireString(data['time'], 'time');
    const name = requireString(data['name'], 'name').trim();
    const phone = requireString(data['phone'], 'phone').trim();
    const email = typeof data['email'] === 'string' ? (data['email'] as string).trim() : '';
    const reason = typeof data['reason'] === 'string' ? (data['reason'] as string).trim() : '';

    if (!name) throw new HttpError(400, 'Please enter the patient name.');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      throw new HttpError(400, 'A valid 10-digit phone number is required.');
    }

    const db = getDb();
    const apptsCol = db.collection('appointments');
    const configRef = db.doc('settings/availability');

    const result = await db.runTransaction(async (tx: Transaction) => {
      const configSnap = await tx.get(configRef);
      const config: AvailabilityConfig = configSnap.exists
        ? (configSnap.data() as AvailabilityConfig)
        : DEFAULT_CONFIG;

      const todayIso = todayIsoIST();
      const nowMinutes = nowMinutesIST();

      const existingSnap = await tx.get(
        apptsCol.where('doctorId', '==', doctorId).where('date', '==', date).where('time', '==', time),
      );
      const bookedTimes = existingSnap.docs.map((doc) => (doc.data() as { time: string }).time);

      const sessions = slotsFor({ iso: date, config, bookedTimes, todayIso, nowMinutes });
      const stillFree = sessions.some((sess) => sess.slots.includes(time));
      if (!stillFree) {
        throw new HttpError(409, 'That time is no longer available.');
      }

      const docRef = apptsCol.doc();
      tx.set(docRef, {
        doctorId,
        date,
        time,
        name,
        phone,
        email,
        reason,
        status: 'Confirmed',
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        id: docRef.id,
        doctorId,
        date,
        time,
        name,
        phone,
        email,
        reason,
        status: 'Confirmed',
        durationMin: config.slotMin,
      };
    });

    return json(result);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    console.error('createAppointment error', err);
    return errorResponse(500, 'Internal error.');
  }
};
