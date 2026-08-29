/**
 * Fetch helper for admin-only endpoints that live outside the
 * Firebase-shaped shim in api.ts — members and renewal requests. It reuses the
 * same admin token api.ts stores at login, so there is one session, not two.
 */
const TOKEN_KEY = 'admin_token';

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function adminRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

/** Shorthand used at every call site that sends a JSON body. */
export const J = (body: unknown) => JSON.stringify(body);
