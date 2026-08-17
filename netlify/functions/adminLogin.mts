import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context } from '@netlify/functions';
import { getAdminAuth, getDb } from './lib/firebase-admin';
import { HttpError, errorResponse, json, readJsonBody, requireString } from './lib/http';

/**
 * Fixed Firebase Auth UID the doctor's session runs as. There's no
 * registration flow or per-doctor account — this UID is minted into a custom
 * token on every successful passcode check, with the { doctor: true } claim
 * Firestore rules key off of. Firebase Auth auto-provisions the underlying
 * user record on first sign-in; nothing needs to be created for it up front.
 */
const DOCTOR_UID = 'doctor';

const LOGIN_ATTEMPT_LIMIT = 8;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function hashPasscode(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Keyed by a hash of the caller's IP so raw IPs never sit in Firestore. */
function attemptKey(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Verifies the clinic's single shared passcode and, on success, mints a
 * custom token for the fixed "doctor" identity with the `doctor: true` claim
 * — the client exchanges it for a real Firebase ID token via
 * signInWithCustomToken, which is what lets firestore.rules authorize the
 * admin dashboard's reads/writes exactly as before. There's no per-doctor
 * account, no registration, and nothing to reset: rotate access by changing
 * the ADMIN_PASSCODE environment variable in the Netlify dashboard.
 *
 * Rate-limited per caller IP (8 failed attempts / 15 minutes) since a short
 * shared passcode is otherwise brute-forceable. Ported from
 * functions/src/index.ts's adminLogin.
 */
export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed.');
  try {
    const body = await readJsonBody<{ passcode?: unknown }>(req);
    const passcode = requireString(body.passcode, 'passcode');
    const adminPasscode = process.env['ADMIN_PASSCODE'];
    if (!adminPasscode) {
      throw new Error('ADMIN_PASSCODE environment variable is not set.');
    }

    const ip = context.ip || 'unknown';
    const db = getDb();
    const attemptRef = db.doc(`adminLoginAttempts/${attemptKey(ip)}`);

    const attemptSnap = await attemptRef.get();
    const attempt = attemptSnap.data() as { count: number; windowStartedAt: number } | undefined;
    const now = Date.now();
    const withinWindow = !!attempt && now - attempt.windowStartedAt < LOGIN_ATTEMPT_WINDOW_MS;

    if (withinWindow && attempt!.count >= LOGIN_ATTEMPT_LIMIT) {
      throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    }

    const expected = hashPasscode(adminPasscode);
    const actual = hashPasscode(passcode);
    const correct = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!correct) {
      await attemptRef.set({
        count: withinWindow ? attempt!.count + 1 : 1,
        windowStartedAt: withinWindow ? attempt!.windowStartedAt : now,
      });
      throw new HttpError(403, 'Incorrect passcode.');
    }

    await attemptRef.delete().catch(() => undefined);
    const token = await getAdminAuth().createCustomToken(DOCTOR_UID, { doctor: true });
    return json({ token });
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    console.error('adminLogin error', err);
    return errorResponse(500, 'Internal error.');
  }
};
