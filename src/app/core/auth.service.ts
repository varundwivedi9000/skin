import { Injectable, computed, effect, inject } from '@angular/core';
import { Auth, authState, signInWithCustomToken, signOut } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { apiCall } from './api-call';

const SESSION_STARTED_KEY = 'asc-admin-session-started-at';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Doctor auth for the single hidden admin route: one shared passcode, no
 * accounts, no registration, nothing to reset. `loginWithPasscode` calls the
 * adminLogin Netlify Function, which checks the passcode server-side and
 * returns a custom token scoped to the fixed doctor identity; exchanging it
 * here via signInWithCustomToken is what gives firestore.rules a real
 * request.auth to check.
 *
 * Firebase Auth's own client session already persists indefinitely across
 * reloads (it auto-refreshes as long as the device stays signed in) — the
 * "30 days, then ask again" behavior on top of that is enforced here via a
 * plain timestamp, not a literal cookie: simpler than standing up a custom
 * server-side session store, and behaviorally the same from the doctor's
 * side — type the passcode once per device, stay in for 30 days.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  /** `undefined` until the first auth-state check resolves, then `User | null`. */
  readonly user = toSignal(authState(this.auth), { initialValue: undefined });

  private readonly sessionWithinWindow = computed(() => {
    const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY) ?? 0);
    return startedAt > 0 && Date.now() - startedAt < SESSION_MAX_AGE_MS;
  });

  readonly isAuthenticated = computed(() => !!this.user() && this.sessionWithinWindow());

  constructor() {
    // A Firebase session can outlive its 30-day window (Firebase itself keeps
    // refreshing it indefinitely) — this is what actually enforces the cutoff.
    effect(() => {
      if (this.user() && !this.sessionWithinWindow()) {
        void this.logout();
      }
    });
  }

  async loginWithPasscode(passcode: string): Promise<void> {
    const { token } = await apiCall<{ token: string }>('adminLogin', { passcode });
    await signInWithCustomToken(this.auth, token);
    localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_STARTED_KEY);
    await signOut(this.auth);
  }
}
