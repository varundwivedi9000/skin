/**
 * "Today"/"now" pinned to the clinic's timezone (India), computed server-side
 * so booking cutoffs are consistent regardless of the visitor's local clock.
 * Ported unchanged from functions/src/dates.ts.
 */
const CLINIC_TIME_ZONE = 'Asia/Kolkata';

export function todayIsoIST(): string {
  // en-CA formats as YYYY-MM-DD, which doubles as our ISO date key.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function nowMinutesIST(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}
