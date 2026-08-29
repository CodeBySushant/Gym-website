/**
 * Member portal API client.
 *
 * Deliberately separate from `api.ts` (the Firebase-compatibility shim the
 * admin panel uses). The member session lives under its own token key, so a
 * member logging in never disturbs an admin session and vice versa.
 */
import {
  Member, MemberOverview, Payment,
  WorkoutPlan, WorkoutLog, DietPlan, Measurement, ProgressPhoto,
  RenewalRequest,
} from './types';

const TOKEN_KEY = 'member_token';

export function getMemberToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setMemberToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

// --- session listeners so the whole portal reacts to login/logout ---
let currentMember: Member | null = null;
const listeners = new Set<(m: Member | null) => void>();

function emit() { for (const cb of listeners) cb(currentMember); }

export function onMemberChanged(cb: (m: Member | null) => void) {
  cb(currentMember);
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getCurrentMember() { return currentMember; }

/** Thrown on 401 so callers can distinguish "logged out" from a real failure. */
export class SessionExpiredError extends Error {}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  const token = getMemberToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (res.status === 401) {
    setMemberToken(null);
    currentMember = null;
    emit();
    throw new SessionExpiredError(data?.error || 'Your session has expired. Please log in again.');
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

// ------------------------- Auth -------------------------
export async function memberLogin(phone: string, password: string): Promise<Member> {
  const data = await request<{ token: string; member: Member }>('/api/member/auth/login', {
    method: 'POST',
    body: json({ phone, password }),
  });
  setMemberToken(data.token);
  currentMember = data.member;
  emit();
  return data.member;
}

export function memberLogout() {
  setMemberToken(null);
  currentMember = null;
  emit();
}

/** Called once at app start. Returns null (without throwing) if not signed in. */
export async function restoreMemberSession(): Promise<Member | null> {
  if (!getMemberToken()) return null;
  try {
    const m = await request<Member>('/api/member/auth/me');
    currentMember = m;
    emit();
    return m;
  } catch {
    return null;
  }
}

/**
 * Changing a password retires every token issued before it, so the server
 * hands back a fresh one for this session. Without storing it, the member
 * would be signed out the instant they updated their own password.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await request<{ ok: true; token?: string }>('/api/member/auth/change-password', {
    method: 'POST',
    body: json({ currentPassword, newPassword }),
  });
  if (res.token) setMemberToken(res.token);
  return res;
}

// ------------------------- Member data -------------------------
export const fetchOverview = () => request<MemberOverview>('/api/member/overview');

export const fetchPayments = () => request<Payment[]>('/api/member/payments');

export const fetchWorkoutPlan = () =>
  request<{ plan: WorkoutPlan | null; logs: WorkoutLog[] }>('/api/member/workout-plan');

export const toggleWorkoutLog = (day: string, date?: string) =>
  request<{ logged: boolean }>('/api/member/workout-log', { method: 'POST', body: json({ day, date }) });

export const fetchDietPlan = () => request<DietPlan | null>('/api/member/diet-plan');

export const fetchMeasurements = () => request<Measurement[]>('/api/member/measurements');

export const addMeasurement = (m: Partial<Measurement>) =>
  request<Measurement>('/api/member/measurements', { method: 'POST', body: json(m) });

export const fetchProgressPhotos = () => request<ProgressPhoto[]>('/api/member/progress-photos');

export const addProgressPhoto = (file: string, angle: string, caption: string) =>
  request<ProgressPhoto>('/api/member/progress-photos', { method: 'POST', body: json({ file, angle, caption }) });

export const deleteProgressPhoto = (id: string) =>
  request<{ ok: true }>(`/api/member/progress-photos/${id}`, { method: 'DELETE' });

/**
 * Returns both halves: `file` is the opaque reference to attach to a record,
 * `url` is a short-lived signed link usable directly in an <img> for preview.
 */
export async function uploadMemberImage(file: File): Promise<{ file: string; url: string }> {
  const MAX_MB = 10;
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Image too large. Please upload a file under ${MAX_MB}MB.`);
  const form = new FormData();
  form.append('file', file);
  return request<{ file: string; url: string }>('/api/member/upload', { method: 'POST', body: form });
}

export const requestRenewal = (planName: string, note: string) =>
  request<RenewalRequest>('/api/member/renewal-request', { method: 'POST', body: json({ planName, note }) });
