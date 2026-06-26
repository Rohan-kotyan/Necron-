/**
 * Fetch wrapper that always sends the JWT Authorization header when the
 * user is logged in. Used by every authenticated API call.
 *
 * On 401 (token expired/invalid), automatically clears the session and
 * reloads to the login screen — previously the user would see "logged-in"
 * UI with every API call silently failing.
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

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
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

  // Handle 401: token expired or invalid. Auto-logout.
  if (res.status === 401 && auth) {
    clearSession();
    // Soft redirect — gives the user a chance to see any error toast first.
    setTimeout(() => {
      window.location.reload();
    }, 50);
    throw new Error(data?.error || "Your session has expired. Please log in again.");
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  return data as T;
}
