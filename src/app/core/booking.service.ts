import { Injectable } from '@angular/core';
import { apiCall } from './api-call';

/** One rolling-window day, as computed server-side by the getBookingWindow function. */
export interface BookingWindowDay {
  iso: string;
  dow: string;
  dnum: number;
  mon: string;
  closed: boolean;
  blocked: boolean;
  full: boolean;
}

/** A morning/evening session with its free slot times ('HH:mm'), from getSlotsForDate. */
export interface SlotSession {
  label: string;
  slots: string[];
}

export interface CreateAppointmentInput {
  doctorId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  reason: string;
}

export interface AppointmentRecord {
  id: string;
  doctorId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  reason: string;
  status: string;
  /** Slot length in minutes at the time of booking — needed to build the .ics DTEND. */
  durationMin: number;
}

/**
 * Thin wrapper around the three patient-facing Netlify Functions. Patients
 * have no Firebase Auth account, so these calls are unauthenticated by
 * design — the functions are the only thing allowed to read/write
 * appointment data on their behalf (see netlify/functions/lib/booking-logic.ts
 * for the ported slotsFor / window7 / sessions logic these functions run
 * server-side).
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  getBookingWindow(doctorId: string): Promise<BookingWindowDay[]> {
    return apiCall('getBookingWindow', { doctorId });
  }

  getSlotsForDate(doctorId: string, date: string): Promise<SlotSession[]> {
    return apiCall('getSlotsForDate', { doctorId, date });
  }

  createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord> {
    return apiCall('createAppointment', input);
  }
}
