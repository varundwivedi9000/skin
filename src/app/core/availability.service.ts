import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  docData,
  deleteDoc,
  getDoc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface AvailabilityHours {
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
  hours: AvailabilityHours;
  slotMin: number;
  bookingDays: number;
  blockedDays: string[];
  blockedRanges: BlockedRange[];
}

export interface AppointmentDoc {
  id: string;
  doctorId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  reason: string;
  status: string;
}

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  hours: { m1: '09:00', m2: '13:00', e1: '16:00', e2: '20:00' },
  slotMin: 30,
  bookingDays: 7,
  blockedDays: [],
  blockedRanges: [],
};

const CONFIG_PATH = 'settings/availability';

/**
 * Doctor-only Firestore access for the admin dashboard: reads and writes go
 * straight through the client SDK, with Firestore security rules (the
 * `doctor` custom claim) as the actual enforcement — see firestore.rules.
 * Patient-facing reads/writes never touch this service; they go through
 * BookingService's Netlify Functions instead.
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly firestore = inject(Firestore);
  private readonly configDoc = doc(this.firestore, CONFIG_PATH);

  availability$(): Observable<AvailabilityConfig | undefined> {
    return docData(this.configDoc) as Observable<AvailabilityConfig | undefined>;
  }

  /** Seeds settings/availability with defaults the first time the doctor opens the dashboard. */
  async ensureConfig(): Promise<void> {
    const snap = await getDoc(this.configDoc);
    if (!snap.exists()) {
      await setDoc(this.configDoc, DEFAULT_AVAILABILITY);
    }
  }

  setHours(hours: AvailabilityHours) {
    return updateDoc(this.configDoc, { hours });
  }

  setSlotMin(slotMin: number) {
    return updateDoc(this.configDoc, { slotMin });
  }

  toggleBlockedDay(iso: string, currentlyBlocked: boolean) {
    return updateDoc(this.configDoc, {
      blockedDays: currentlyBlocked ? arrayRemove(iso) : arrayUnion(iso),
    });
  }

  restoreAll() {
    return updateDoc(this.configDoc, { blockedDays: [], blockedRanges: [] });
  }

  addBlockedRange(range: Omit<BlockedRange, 'id'>) {
    const withId: BlockedRange = { ...range, id: 'b' + Date.now() };
    return updateDoc(this.configDoc, { blockedRanges: arrayUnion(withId) });
  }

  removeBlockedRange(range: BlockedRange) {
    return updateDoc(this.configDoc, { blockedRanges: arrayRemove(range) });
  }

  /** All appointments (any doctor) with date in [fromIso, toIso], for the admin today/upcoming views. */
  appointmentsInWindow(fromIso: string, toIso: string): Observable<AppointmentDoc[]> {
    const q = query(
      collection(this.firestore, 'appointments'),
      where('date', '>=', fromIso),
      where('date', '<=', toIso),
      orderBy('date'),
      orderBy('time'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<AppointmentDoc[]>;
  }

  cancelAppointment(id: string) {
    return deleteDoc(doc(this.firestore, 'appointments', id));
  }
}
