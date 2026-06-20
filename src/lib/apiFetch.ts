/**
 * Tiny fetch wrapper that always sends the JWT Authorization header when the
 * user is logged in. Used by the timetable components.
 *
 * Why a wrapper? The rest of the codebase sends NO auth headers, but the
 * timetable module enforces role-based access on the backend (per spec).
 * Without this wrapper, every /api/admin/timetable* call would 401.
 */

const SESSION_KEY = "veritas_user_session";

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  /** When true, send the Bearer token. Default: true. */
  auth?: boolean;
  /** When true, JSON.stringify the body and set Content-Type: application/json. */
  json?: boolean;
  /** Request body — accepts any JSON-serialisable value when `json: true`. */
  body?: any;
}

export async function apiFetch<T = any>(
  url: string,
  opts: FetchOptions = {}
): Promise<T> {
  const { auth = true, json = true, headers, body, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }
  let finalBody = body;
  if (json && body !== undefined && body !== null && typeof body !== "string") {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: finalBody as BodyInit,
  });

  // Parse safely — Vercel can return an empty body for unhandled routes.
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Server returned a non-JSON response (HTTP ${res.status}).`
      );
    }
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  return data as T;
}
