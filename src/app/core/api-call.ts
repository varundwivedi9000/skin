/** Thrown by apiCall on a non-2xx response; `status` mirrors the HTTP status the function returned. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Thin fetch wrapper for the Netlify Functions under /api/* (redirected to
 * /.netlify/functions/* in netlify.toml). Replaces the old @angular/fire
 * httpsCallable wrapper now that the backend runs on Netlify instead of
 * Firebase Cloud Functions.
 */
export async function apiCall<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: { message?: string } })?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}
