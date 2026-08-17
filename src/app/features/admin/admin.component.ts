import { ChangeDetectionStrategy, Component, EnvironmentInjector, computed, inject, runInInjectionContext, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, of, retry, shareReplay, switchMap } from 'rxjs';
import { DOCTORS } from '../../core/content';
import { AuthService } from '../../core/auth.service';
import { ApiError } from '../../core/api-call';
import { AvailabilityHours, AvailabilityService, BlockedRange } from '../../core/availability.service';
import { dateLong, dateMid, dowShort, formatTime, hhmm, isoOf, minsOf, monShort } from '../../shared/date.util';

const DAY_BASE =
  'cursor:pointer;font-family:var(--font-body);color:var(--color-text);border:0;border-radius:var(--radius-md);padding:14px 16px;min-width:92px;text-align:center;';
const SLOT_BASE =
  "cursor:pointer;font-family:var(--font-body);font-size:15px;min-width:104px;min-height:44px;border:0;border-radius:var(--radius-md);padding:12px 16px;font-feature-settings:'tnum' 1;";

type Tab = 'today' | 'upcoming' | 'avail';

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  private readonly availability = inject(AvailabilityService);
  private readonly injector = inject(EnvironmentInjector);
  protected readonly auth = inject(AuthService);

  protected readonly doctors = DOCTORS;

  private readonly today = new Date();
  protected readonly todayIso = isoOf(this.today);
  private readonly maxWindowEndIso = isoOf(addDays(this.today, 13));

  protected readonly tab = signal<Tab>('today');
  protected readonly openApptId = signal<string | null>(null);
  protected readonly confirmBlockDay = signal<string | null>(null);
  protected readonly rangeDraft = signal({ date: this.todayIso, s: '14:00', e: '17:00' });
  protected readonly rangeError = signal('');

  protected readonly passcode = signal('');
  protected readonly loginSubmitting = signal(false);
  protected readonly loginError = signal('');

  // Deferred until isAuthenticated flips true, so an unauthenticated visitor
  // (seeing the passcode form) never triggers a permission-denied Firestore
  // read — and re-subscribes cleanly on every fresh sign-in rather than
  // staying dead after one early error. shareReplay so the three consumers
  // below react to one shared auth-state stream instead of each opening (and
  // tearing down) their own independent Firestore listener on every change.
  private readonly isAuthenticated$ = toObservable(this.auth.isAuthenticated).pipe(
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  // Built once, synchronously, during construction (a real Angular injection
  // context) rather than lazily inside the switchMap callbacks below —
  // AngularFire's docData/collectionData wrappers need an injection context
  // *at the moment they're called* to zone-wrap the underlying Firestore SDK
  // listener correctly. Subscribing to the same cold Observable repeatedly
  // (which is all switchMap does below) is normal and opens a fresh
  // Firestore listener each time.
  //
  // retry+catchError matters here for a real reason, not just polish: the
  // Firestore Web SDK's listener can throw a transient internal error right
  // around an auth-token change (observed during sign-in/out against the
  // emulator). rxfire turns that into an RxJS `error()`, which is terminal —
  // and toSignal's contract is to *throw on every subsequent read* once its
  // source errors. Without recovery, one transient hiccup would permanently
  // wedge this signal (and therefore every template binding that reads it)
  // for the rest of the session. retry() re-opens the listener; the
  // catchError is a last-resort fallback so a read can never throw.
  private readonly config$ = this.availability.availability$().pipe(
    retry({ count: 5, delay: 500 }),
    catchError((err) => {
      console.error('[admin] settings/availability listener failed', err);
      return of(undefined);
    }),
  );
  private readonly appts$ = this.availability.appointmentsInWindow(this.todayIso, this.maxWindowEndIso).pipe(
    retry({ count: 5, delay: 500 }),
    catchError((err) => {
      console.error('[admin] appointments listener failed', err);
      return of([]);
    }),
  );

  protected readonly config = toSignal(
    this.isAuthenticated$.pipe(switchMap((authed) => (authed ? this.config$ : of(undefined)))),
    { initialValue: undefined },
  );
  protected readonly appts = toSignal(
    this.isAuthenticated$.pipe(switchMap((authed) => (authed ? this.appts$ : of([])))),
    { initialValue: [] },
  );

  constructor() {
    this.isAuthenticated$.pipe(takeUntilDestroyed()).subscribe((authed) => {
      if (authed) runInInjectionContext(this.injector, () => void this.availability.ensureConfig());
    });
  }

  protected setPasscode(e: Event) {
    this.passcode.set((e.target as HTMLInputElement).value);
  }

  protected async submitLogin(e: Event) {
    e.preventDefault();
    this.loginSubmitting.set(true);
    this.loginError.set('');
    try {
      await this.auth.loginWithPasscode(this.passcode());
      this.passcode.set('');
    } catch (err) {
      this.loginError.set(
        err instanceof ApiError && err.status === 429
          ? 'Too many attempts. Try again in a few minutes.'
          : 'Incorrect passcode.',
      );
    } finally {
      this.loginSubmitting.set(false);
    }
  }

  protected readonly windowIsos = computed(() => {
    const days = Math.max(2, Math.min(14, this.config()?.bookingDays ?? 7));
    const out: { iso: string; dow: string; dnum: number; mon: string; closed: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(this.today, i);
      out.push({
        iso: isoOf(d),
        dow: i === 0 ? 'Today' : dowShort(d),
        dnum: d.getDate(),
        mon: monShort(d),
        closed: d.getDay() === 0,
      });
    }
    return out;
  });

  protected readonly adminHeading = computed(
    () => ({ today: 'Today', upcoming: 'Upcoming', avail: 'Availability' })[this.tab()],
  );
  protected readonly adminSub = computed(
    () =>
      ({
        today: dateLong(this.todayIso),
        upcoming: `Appointments in the next ${this.windowIsos().length} days`,
        avail: 'Close days, block time ranges and set working hours',
      })[this.tab()],
  );

  protected readonly todayRows = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    const iso = this.todayIso;
    if (new Date(this.today).getDay() === 0) return [];
    if (cfg.blockedDays.includes(iso)) return [];

    const sessions = [
      { label: 'Morning', s: cfg.hours.m1, e: cfg.hours.m2 },
      { label: 'Evening', s: cfg.hours.e1, e: cfg.hours.e2 },
    ];
    const todaysAppts = this.appts().filter((a) => a.date === iso);
    const rows: {
      id: string | null;
      time: string;
      label: string;
      ink: string;
      status: string;
      tagClass: string;
    }[] = [];
    for (const sess of sessions) {
      for (let m = minsOf(sess.s); m + cfg.slotMin <= minsOf(sess.e); m += cfg.slotMin) {
        const t = hhmm(m);
        const appt = todaysAppts.find((a) => a.time === t);
        const rangeBlocked = cfg.blockedRanges.some(
          (b) => b.date === iso && m >= minsOf(b.s) && m < minsOf(b.e),
        );
        rows.push({
          id: appt?.id ?? null,
          time: formatTime(t),
          label: appt ? appt.name + (appt.reason ? ' · ' + appt.reason : '') : rangeBlocked ? 'Blocked' : 'Available',
          ink: appt ? 'var(--color-text)' : 'color-mix(in srgb, var(--color-text) 55%, transparent)',
          status: appt ? 'Booked' : rangeBlocked ? 'Blocked' : 'Open',
          tagClass: appt ? 'tag tag-accent' : 'tag tag-neutral',
        });
      }
    }
    return rows;
  });
  protected readonly todayEmpty = computed(() => this.todayRows().length === 0);
  protected readonly todayBlocked = computed(() => !!this.config()?.blockedDays.includes(this.todayIso));

  protected readonly upcomingGroups = computed(() => {
    const winIsos = this.windowIsos().map((d) => d.iso);
    const upcoming = this.appts()
      .filter((a) => a.date > this.todayIso && winIsos.includes(a.date))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const groups: {
      iso: string;
      label: string;
      rows: { id: string; time: string; name: string; reason: string; doctor: string; status: string }[];
    }[] = [];
    for (const a of upcoming) {
      let g = groups.find((x) => x.iso === a.date);
      if (!g) {
        g = { iso: a.date, label: dateLong(a.date), rows: [] };
        groups.push(g);
      }
      const doc = DOCTORS.find((x) => x.id === a.doctorId);
      g.rows.push({
        id: a.id,
        time: formatTime(a.time),
        name: a.name,
        reason: a.reason || '—',
        doctor: doc ? doc.name.replace('Dr. ', '') : '',
        status: a.status,
      });
    }
    return groups;
  });
  protected readonly upcomingEmpty = computed(() => this.upcomingGroups().length === 0);

  protected readonly adminDays = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    return this.windowIsos().map((d) => {
      const blocked = cfg.blockedDays.includes(d.iso);
      const n = this.appts().filter((a) => a.date === d.iso).length;
      return {
        iso: d.iso,
        dow: d.dow,
        dnum: d.dnum,
        booked: d.closed ? '' : n ? `${n} booked` : 'No bookings',
        state: d.closed ? 'Weekly off' : blocked ? 'Blocked' : 'Open',
        disabled: d.closed,
        blocked,
        n,
        style:
          DAY_BASE +
          (d.closed
            ? 'background:color-mix(in srgb, var(--color-surface) 30%, transparent);box-shadow:var(--shadow-sm);opacity:0.45;cursor:not-allowed;'
            : blocked
              ? 'background:color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));box-shadow:0 0 0 1px var(--color-accent);'
              : 'background:color-mix(in srgb, var(--color-surface) 55%, transparent);box-shadow:var(--shadow-sm);'),
      };
    });
  });

  protected readonly blocks = computed(() => {
    const cfg = this.config();
    if (!cfg) return [];
    const dayBlocks = cfg.blockedDays.map((iso) => ({
      key: 'day:' + iso,
      label: dateLong(iso) + ' — full day',
      kind: 'Full day',
      restore: () => this.availability.toggleBlockedDay(iso, true),
    }));
    const rangeBlocks = cfg.blockedRanges.map((b) => ({
      key: 'range:' + b.id,
      label: `${dateMid(b.date)} — ${formatTime(b.s)} to ${formatTime(b.e)}`,
      kind: 'Time range',
      restore: () => this.availability.removeBlockedRange(b),
    }));
    return [...dayBlocks, ...rangeBlocks];
  });
  protected readonly blocksEmpty = computed(() => this.blocks().length === 0);
  protected readonly hasBlocks = computed(() => this.blocks().length > 0);

  protected readonly hoursError = computed(() => {
    const h = this.config()?.hours;
    if (!h) return '';
    if (minsOf(h.m2) <= minsOf(h.m1) || minsOf(h.e2) <= minsOf(h.e1)) {
      return 'Each session must end after it starts — patients see no slots for a session that does not.';
    }
    if (minsOf(h.e1) < minsOf(h.m2)) return 'The evening session starts before the morning one ends.';
    return '';
  });

  protected readonly durations = computed(() => {
    const cur = this.config()?.slotMin;
    return [15, 30, 45].map((n) => ({
      n,
      label: `${n} min`,
      style:
        SLOT_BASE +
        (cur === n
          ? 'background:color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));box-shadow:0 0 0 1px var(--color-accent);color:var(--color-accent-200);'
          : 'background:color-mix(in srgb, var(--color-surface) 55%, transparent);box-shadow:var(--shadow-sm);color:var(--color-text);'),
    }));
  });

  protected readonly rangeMax = computed(() => {
    const w = this.windowIsos();
    return w.length ? w[w.length - 1].iso : this.todayIso;
  });

  protected readonly openAppt = computed(() => {
    const id = this.openApptId();
    if (!id) return null;
    const a = this.appts().find((x) => x.id === id);
    if (!a) return null;
    const doc = DOCTORS.find((x) => x.id === a.doctorId);
    return {
      ...a,
      doctorName: doc?.name ?? '',
      dateLong: dateLong(a.date),
      timeLabel: formatTime(a.time),
      emailLabel: a.email || 'Not provided',
      reasonLabel: a.reason || 'Not provided',
    };
  });

  protected readonly confirmBlockView = computed(() => {
    const iso = this.confirmBlockDay();
    if (!iso) return null;
    const n = this.appts().filter((a) => a.date === iso).length;
    return {
      title: `Block ${dateMid(iso)}?`,
      body: `${n} appointment(s) are already booked on this day. Blocking it stops new bookings; the existing appointments stay in your list and you will need to call those patients.`,
    };
  });

  protected setTab(tab: Tab) {
    this.tab.set(tab);
  }

  protected openApptRow(id: string | null) {
    if (id) this.openApptId.set(id);
  }

  protected closeAppt() {
    this.openApptId.set(null);
  }

  protected cancelAppt() {
    const id = this.openApptId();
    if (!id) return;
    void this.availability.cancelAppointment(id);
    this.openApptId.set(null);
  }

  protected toggleDay(d: { iso: string; disabled: boolean; blocked: boolean; n: number }) {
    if (d.disabled) return;
    if (d.blocked) {
      void this.availability.toggleBlockedDay(d.iso, true);
      return;
    }
    if (d.n > 0) {
      this.confirmBlockDay.set(d.iso);
      return;
    }
    void this.availability.toggleBlockedDay(d.iso, false);
  }

  protected dismissBlock() {
    this.confirmBlockDay.set(null);
  }

  protected acceptBlock() {
    const iso = this.confirmBlockDay();
    if (!iso) return;
    void this.availability.toggleBlockedDay(iso, false);
    this.confirmBlockDay.set(null);
  }

  protected restoreAll() {
    void this.availability.restoreAll();
  }

  protected setRangeDate(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.rangeDraft.update((r) => ({ ...r, date: v }));
  }

  protected setRangeStart(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.rangeDraft.update((r) => ({ ...r, s: v }));
  }

  protected setRangeEnd(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.rangeDraft.update((r) => ({ ...r, e: v }));
  }

  protected addRange() {
    const r = this.rangeDraft();
    if (!r.date) {
      this.rangeError.set('Pick a date within the booking window.');
      return;
    }
    if (minsOf(r.e) <= minsOf(r.s)) {
      this.rangeError.set('The end time must be after the start time.');
      return;
    }
    this.rangeError.set('');
    void this.availability.addBlockedRange({ date: r.date, s: r.s, e: r.e });
  }

  protected removeRange(range: BlockedRange) {
    void this.availability.removeBlockedRange(range);
  }

  protected setHour(key: keyof AvailabilityHours, e: Event) {
    const v = (e.target as HTMLInputElement).value;
    const cfg = this.config();
    if (!cfg) return;
    void this.availability.setHours({ ...cfg.hours, [key]: v });
  }

  protected setSlotMin(n: number) {
    void this.availability.setSlotMin(n);
  }

  protected async logout() {
    await this.auth.logout();
  }

  protected stop(e: Event) {
    e.stopPropagation();
  }
}
