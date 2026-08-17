import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

/**
 * Cloud Functions got Admin SDK credentials for free (they run inside the
 * Firebase project). Netlify Functions run outside GCP entirely, so they need
 * an explicit service account key — stored as the FIREBASE_SERVICE_ACCOUNT_KEY
 * Netlify environment variable (raw JSON from Firebase console → Project
 * settings → Service accounts → Generate new private key).
 *
 * `netlify dev` sets NETLIFY_DEV=true automatically; in that case we skip the
 * real credential and point the Admin SDK at the local Firestore/Auth
 * emulators instead (started via `firebase emulators:start --only firestore,auth`),
 * exactly like the old Cloud Functions did implicitly when run through
 * `firebase emulators:start`.
 *
 * Initialization is lazy (only runs on first `getDb()`/`getAdminAuth()` call,
 * inside a handler's own try/catch) rather than at module load — a bad or
 * missing FIREBASE_SERVICE_ACCOUNT_KEY should surface as a normal, logged 500
 * from the handler, not crash the function before its try/catch even exists.
 */
let app: App | undefined;

function ensureApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length) {
    app = existing[0];
    return app;
  }

  if (process.env['NETLIFY_DEV'] === 'true') {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= '127.0.0.1:9099';
    app = initializeApp({ projectId: process.env['FIREBASE_PROJECT_ID'] || 'demo-awesome-skin-clinic' });
    return app;
  }

  const raw = process.env['FIREBASE_SERVICE_ACCOUNT_KEY'];
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON — check it was pasted as a single unbroken value.');
  }

  app = initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
  return app;
}

export function getDb(): Firestore {
  return getFirestore(ensureApp());
}

export function getAdminAuth(): Auth {
  return getAuth(ensureApp());
}
