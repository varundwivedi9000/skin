import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DOCTORS, CLINIC } from '../../core/content';
import {
  AppointmentRecord,
  BookingService,
  BookingWindowDay,
  SlotSession,
} from '../../core/booking.service';
import { ApiError } from '../../core/api-call';
import { ViewportService } from '../../core/viewport.service';
import { gridCols } from '../../shared/grid.util';
import { dateLong, formatTime, minsOf } from '../../shared/date.util';

interface FormState {
  name: string;
  phone: string;
  email: string;
  reason: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  form?: string;
}

interface BookingErrorState {
  kind: 'taken' | 'network';
  title: string;
  body: string;
}

const CARD_BTN =
  'text-align:left;cursor:pointer;font-family:var(--font-body);color:var(--color-text);border:0;border-radius:var(--radius-md);padding:20px;';
const SLOT_BASE =
  "cursor:pointer;font-family:var(--font-body);font-size:15px;min-width:104px;min-height:44px;border:0;border-radius:var(--radius-md);padding:12px 16px;font-feature-settings:'tnum' 1;";
const DAY_BASE =
  'cursor:pointer;font-family:var(--font-body);color:var(--color-text);border:0;border-radius:var(--radius-md);padding:14px 16px;min-width:92px;text-align:center;';

const STEP_DEFS = [
  { n: 1, label: 'Doctor' },
  { n: 2, label: 'Date' },
  { n: 3, label: 'Time' },
  { n: 4, label: 'Details' },
];

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './book.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookComponent {
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  protected readonly viewport = inject(ViewportService);

  protected readonly clinic = CLINIC;
  protected readonly doctors = DOCTORS;

  protected readonly screen = signal<'wizard' | 'confirmed'>('wizard');
  protected readonly step = signal(1);
  protected readonly doctorId = signal(DOCTORS[0].id);
  protected readonly date = signal<string | null>(null);
  protected readonly time = signal<string | null>(null);
  protected readonly form = signal<FormState>({ name: '', phone: '', email: '', reason: '' });
  protected readonly errors = signal<FormErrors>({});
  protected readonly submitting = signal(false);
  protected readonly bookingError = signal<BookingErrorState | null>(null);
  protected readonly booked = signal<AppointmentRecord | null>(null);

  protected readonly windowDays = signal<BookingWindowDay[]>([]);
  protected readonly windowLoading = signal(true);
  protected readonly windowError = signal(false);
  protected readonly sessions = signal<SlotSession[]>([]);
  protected readonly slotsLoading = signal(false);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const presetDoctor = qp.get('doctor');
    if (presetDoctor && DOCTORS.some((d) => d.id === presetDoctor)) this.doctorId.set(presetDoctor);
    if (Number(qp.get('step')) === 2) this.step.set(2);

    effect(() => {
      const id = this.doctorId();
      this.loadWindow(id);
    });

    effect(() => {
      const id = this.doctorId();
      const d = this.date();
      if (!d) {
        this.sessions.set([]);
        return;
      }
      this.slotsLoading.set(true);
      void this.bookingService
        .getSlotsForDate(id, d)
        .then((sessions) => this.sessions.set(sessions))
        .catch((err) => {
          console.error('[book] getSlotsForDate failed', err);
          this.sessions.set([]);
        })
        .finally(() => this.slotsLoading.set(false));
    });
  }

  private loadWindow(doctorId: string) {
    this.windowLoading.set(true);
    this.windowError.set(false);
    void this.bookingService
      .getBookingWindow(doctorId)
      .then((days) => this.windowDays.set(days))
      .catch((err) => {
        console.error('[book] getBookingWindow failed', err);
        this.windowDays.set([]);
        this.windowError.set(true);
      })
      .finally(() => this.windowLoading.set(false));
  }

  protected retryWindow() {
    this.loadWindow(this.doctorId());
  }

  protected readonly stepBars = computed(() => {
    const cur = this.step();
    return STEP_DEFS.map((s) => ({
      label: s.label,
      bar: cur >= s.n ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-neutral-700) 70%, transparent)',
      ink: cur >= s.n ? 'var(--color-accent-300)' : 'color-mix(in srgb, var(--color-text) 50%, transparent)',
    }));
  });

  protected readonly doctorChoiceViews = computed(() => {
    const sel = this.doctorId();
    return this.doctors.map((d) => ({
      ...d,
      style:
        CARD_BTN +
        (sel === d.id
          ? 'background:color-mix(in srgb, var(--color-accent) 16%, var(--color-surface));box-shadow:0 0 0 1px var(--color-accent);'
          : 'background:color-mix(in srgb, var(--color-surface) 55%, transparent);box-shadow:var(--shadow-sm);'),
    }));
  });

  protected readonly dayViews = computed(() => {
    const sel = this.date();
    return this.windowDays().map((d) => {
      const closedOrBlocked = d.closed || d.blocked;
      const disabled = closedOrBlocked || d.full;
      const on = sel === d.iso;
      return {
        iso: d.iso,
        dow: d.dow,
        dnum: d.dnum,
        mon: d.mon,
        disabled,
        note: closedOrBlocked ? 'Closed' : d.full ? 'Full' : 'Open',
        noteInk: disabled ? 'color-mix(in srgb, var(--color-text) 45%, transparent)' : 'var(--color-accent-300)',
        style:
          DAY_BASE +
          (disabled
            ? 'background:color-mix(in srgb, var(--color-surface) 30%, transparent);box-shadow:var(--shadow-sm);opacity:0.45;cursor:not-allowed;'
            : on
              ? 'background:color-mix(in srgb, var(--color-accent) 16%, var(--color-surface));box-shadow:0 0 0 1px var(--color-accent);'
              : 'background:color-mix(in srgb, var(--color-surface) 55%, transparent);box-shadow:var(--shadow-sm);'),
      };
    });
  });

  protected readonly windowLabel = computed(() => `${this.windowDays().length} days`);
  protected readonly dateHeading = computed(() => (this.date() ? dateLong(this.date()!) : 'Choose a date first'));

  protected readonly slotTotal = computed(() => this.sessions().reduce((n, s) => n + s.slots.length, 0));
  protected readonly slotsEmpty = computed(() => !this.slotsLoading() && this.slotTotal() === 0);
  protected readonly slotsReady = computed(() => !this.slotsLoading() && this.slotTotal() > 0);
  protected readonly slotCountLabel = computed(() =>
    this.slotsLoading() ? '' : this.slotTotal() ? `${this.slotTotal()} slots free` : '',
  );

  protected readonly slotSessionViews = computed(() => {
    const sel = this.time();
    return this.sessions().map((sess) => ({
      label: sess.label,
      slots: sess.slots.map((t) => ({
        time: t,
        label: formatTime(t),
        style:
          SLOT_BASE +
          (sel === t
            ? 'background:color-mix(in srgb, var(--color-accent) 20%, var(--color-surface));box-shadow:0 0 0 1px var(--color-accent);color:var(--color-accent-200);'
            : 'background:color-mix(in srgb, var(--color-surface) 55%, transparent);box-shadow:var(--shadow-sm);color:var(--color-text);'),
      })),
    }));
  });

  protected readonly bookGrid = computed(() =>
    gridCols(this.viewport.isMobile(), 1.1, 0.9, this.viewport.isMobile() ? '28px' : 'clamp(24px,4vw,48px)'),
  );
  protected readonly summarySticky = computed(() => (this.viewport.isMobile() ? '' : 'position:sticky;top:96px'));

  protected readonly summary = computed(() => ({
    doctor: this.doctors.find((d) => d.id === this.doctorId())?.name ?? '',
    date: this.date() ? dateLong(this.date()!) : 'Not selected',
    time: this.time() ? formatTime(this.time()!) : 'Not selected',
  }));

  protected readonly submitLabel = computed(() => (this.submitting() ? 'Confirming…' : 'Confirm Appointment'));

  protected readonly bookedView = computed(() => {
    const appt = this.booked();
    if (!appt) return null;
    return {
      ...appt,
      doctorName: this.doctors.find((d) => d.id === appt.doctorId)?.name ?? '',
      dateLong: dateLong(appt.date),
      timeLabel: formatTime(appt.time),
      ics: this.icsHref(appt),
    };
  });

  protected pickDoctor(id: string) {
    this.doctorId.set(id);
    this.time.set(null);
  }

  protected pickDate(iso: string) {
    this.date.set(iso);
    this.time.set(null);
  }

  protected pickTime(t: string) {
    this.time.set(t);
    this.errors.set({});
  }

  protected toStep1() {
    this.step.set(1);
  }

  protected toStep2() {
    this.step.set(2);
  }

  protected toStep3() {
    if (!this.date()) {
      const first = this.dayViews().find((d) => !d.disabled);
      if (first) this.pickDate(first.iso);
    }
    this.step.set(3);
  }

  protected toStep4() {
    if (!this.time()) {
      this.errors.set({ form: 'Please select a time slot to continue.' });
      return;
    }
    this.step.set(4);
    this.errors.set({});
  }

  protected setName(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, name: v }));
  }

  protected setPhone(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, phone: v }));
  }

  protected setEmail(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, email: v }));
  }

  protected setReason(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, reason: v }));
  }

  protected async confirmBooking() {
    const f = this.form();
    const errs: FormErrors = {};
    if (!f.name.trim()) errs.name = 'Please enter the patient name.';
    const digits = f.phone.replace(/\D/g, '');
    if (!digits) errs.phone = 'A phone number is required so the clinic can confirm.';
    else if (digits.length < 10) errs.phone = 'That number looks short — please enter a 10-digit mobile number.';
    if (!this.date() || !this.time()) errs.form = 'Please choose a date and a time slot before confirming.';
    if (Object.keys(errs).length) {
      this.errors.set(errs);
      this.bookingError.set(null);
      return;
    }

    this.errors.set({});
    this.bookingError.set(null);
    this.submitting.set(true);
    const takenTime = this.time()!;
    try {
      const appt = await this.bookingService.createAppointment({
        doctorId: this.doctorId(),
        date: this.date()!,
        time: this.time()!,
        name: f.name.trim(),
        phone: f.phone.trim(),
        email: f.email.trim(),
        reason: f.reason.trim(),
      });
      this.booked.set(appt);
      this.screen.set('confirmed');
      window.scrollTo(0, 0);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) {
        this.time.set(null);
        if (this.date()) {
          this.slotsLoading.set(true);
          void this.bookingService
            .getSlotsForDate(this.doctorId(), this.date()!)
            .then((sessions) => this.sessions.set(sessions))
            .finally(() => this.slotsLoading.set(false));
        }
        this.bookingError.set({
          kind: 'taken',
          title: 'That slot was just taken',
          body: `Someone booked ${formatTime(takenTime)} while you were filling in your details. Pick another time — the rest of your details are saved.`,
        });
      } else {
        this.bookingError.set({
          kind: 'network',
          title: "Couldn't reach the clinic",
          body: 'The appointment was not saved. Check your connection and try again, or call the clinic to book by phone.',
        });
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected retryBookingError() {
    const err = this.bookingError();
    if (!err) return;
    if (err.kind === 'taken') {
      this.step.set(3);
      this.bookingError.set(null);
    } else {
      void this.confirmBooking();
    }
  }

  private icsHref(appt: AppointmentRecord): string {
    const d = appt.date.replace(/-/g, '');
    const startHHmm = appt.time.replace(':', '') + '00';
    const endMinutes = minsOf(appt.time) + appt.durationMin;
    const end =
      String(Math.floor(endMinutes / 60)).padStart(2, '0') + String(endMinutes % 60).padStart(2, '0') + '00';
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'SUMMARY:Dermatology appointment — Awesome Skin Clinic',
      `DTSTART:${d}T${startHHmm}`,
      `DTEND:${d}T${end}`,
      'LOCATION:Awesome Skin Clinic',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }
}
