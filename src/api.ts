/**
 * REST API client — replaces Firebase entirely.
 * Exposes the same function names the app previously used (collection, query,
 * onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDocs, auth, ...) so all
 * existing components work unchanged against the Express + MongoDB backend.
 */

// ------------------------- Auth token & session -------------------------
const TOKEN_KEY = 'admin_token';

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t: string | null) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin';
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: null;
  providerData: never[];
}

let currentUser: SessionUser | null = null;
const authListeners = new Set<(u: SessionUser | null) => void>();

function emitAuth() {
  for (const cb of authListeners) cb(currentUser);
}

function toSessionUser(u: { uid: string; email: string; displayName: string }): SessionUser {
  return { ...u, role: 'admin', emailVerified: true, isAnonymous: false, tenantId: null, providerData: [] };
}

/** Minimal stand-in for the old firebase `auth` object (used by Footer, error logs). */
export const auth = {
  get currentUser() { return currentUser; },
  onAuthStateChanged(cb: (u: SessionUser | null) => void) {
    cb(currentUser);
    authListeners.add(cb);
    // Braces matter: Set.delete returns a boolean, and a React effect cleanup
    // must return void.
    return () => { authListeners.delete(cb); };
  },
};

export function onAuthStateChanged(_auth: unknown, cb: (u: SessionUser | null) => void) {
  return auth.onAuthStateChanged(cb);
}

// ------------------------- HTTP helper -------------------------
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// ------------------------- Auth API -------------------------
export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  const data = await request<{ token: string; user: { uid: string; email: string; displayName: string } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  setToken(data.token);
  currentUser = toSessionUser(data.user);
  emitAuth();
  return { user: currentUser };
}

export async function signOut(_auth?: unknown) {
  setToken(null);
  currentUser = null;
  emitAuth();
}

/** Called once at app start: restores the session from a stored token. */
export async function restoreSession(): Promise<SessionUser | null> {
  if (!getToken()) return null;
  try {
    const u = await request<{ uid: string; email: string; displayName: string }>('/api/auth/me');
    currentUser = toSessionUser(u);
    emitAuth();
    return currentUser;
  } catch {
    setToken(null);
    return null;
  }
}

// ------------------------- Firestore-style data layer -------------------------
export const db = {}; // kept for call-site compatibility; unused

interface CollectionRef { path: string; }
interface DocRef { path: string; id: string; }
type Constraint =
  | { kind: 'orderBy'; field: string; dir: 'asc' | 'desc' }
  | { kind: 'where'; field: string; value: unknown }
  | { kind: 'limit'; n: number };
interface Query { path: string; constraints: Constraint[]; }

export function collection(_db: unknown, path: string): CollectionRef { return { path }; }
export function doc(_db: unknown, path: string, id: string): DocRef { return { path, id }; }
export function query(ref: CollectionRef | Query, ...constraints: Constraint[]): Query {
  const base = 'constraints' in ref ? ref.constraints : [];
  return { path: ref.path, constraints: [...base, ...constraints] };
}
export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint { return { kind: 'orderBy', field, dir }; }
export function where(field: string, _op: string, value: unknown): Constraint { return { kind: 'where', field, value }; }
export function limit(n: number): Constraint { return { kind: 'limit', n }; }
export function serverTimestamp(): undefined { return undefined; } // backend sets createdAt itself

function endpointFor(path: string): string {
  if (path === 'leads') return '/api/leads';
  if (path === 'settings') return '/api/settings';
  return `/api/content/${path}`;
}

async function fetchRows(path: string, constraints: Constraint[] = []): Promise<any[]> {
  if (path === 'settings') {
    const row = await request<any>('/api/settings');
    return row ? [row] : [];
  }
  if (path === 'leads') {
    return request<any[]>('/api/leads'); // server sorts newest-first
  }
  const params = new URLSearchParams();
  for (const c of constraints) {
    if (c.kind === 'orderBy') { params.set('orderBy', c.field); params.set('dir', c.dir); }
    if (c.kind === 'where') params.set(String(c.field), String(c.value));
    if (c.kind === 'limit') params.set('limit', String(c.n));
  }
  const qs = params.toString();
  return request<any[]>(`${endpointFor(path)}${qs ? `?${qs}` : ''}`);
}

function snapshotOf(rows: any[]) {
  return {
    docs: rows.map((r) => {
      const { id, ...rest } = r;
      return { id, data: () => rest };
    }),
    empty: rows.length === 0,
    size: rows.length,
  };
}

// --- change notifications: after a write, every subscriber of that collection re-fetches ---
const subscribers = new Map<string, Set<() => void>>();
const notifyTimers = new Map<string, ReturnType<typeof setTimeout>>();

function notify(path: string) {
  // Debounced so bulk writes (e.g. drag-reorder) trigger a single refetch.
  clearTimeout(notifyTimers.get(path));
  notifyTimers.set(path, setTimeout(() => {
    for (const cb of subscribers.get(path) || []) cb();
  }, 200));
}

/**
 * How often a subscription re-checks the server, in ms.
 *
 * The notify() mechanism above only fires for writes made in THIS tab, so
 * before this poll existed two staff editing at once never saw each other's
 * changes — one would happily overwrite the other's edit. A real socket would
 * be better; a 30s poll is a fraction of the code and plenty for a gym.
 */
const POLL_MS = 30_000;

export function onSnapshot(
  q: Query | CollectionRef,
  cb: (snap: ReturnType<typeof snapshotOf>) => void,
  onError?: (e: Error) => void
) {
  const path = q.path;
  const constraints = 'constraints' in q ? q.constraints : [];
  const load = async () => {
    try { cb(snapshotOf(await fetchRows(path, constraints))); }
    catch (e) { onError?.(e as Error); }
  };
  load();
  if (!subscribers.has(path)) subscribers.set(path, new Set());
  subscribers.get(path)!.add(load);

  // Skip the poll while the tab is hidden — no point burning requests on a
  // dashboard nobody is looking at. Coming back to the tab refetches at once.
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') load();
  }, POLL_MS);
  const onVisible = () => { if (document.visibilityState === 'visible') load(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);

  return () => {
    subscribers.get(path)?.delete(load);
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
  };
}

export async function getDocs(q: Query | CollectionRef) {
  const constraints = 'constraints' in q ? q.constraints : [];
  return snapshotOf(await fetchRows(q.path, constraints));
}

export async function getDoc(_ref: DocRef): Promise<never> {
  throw new Error('getDoc is not supported — use getDocs / onSnapshot');
}

function stripUndefined(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

export async function addDoc(ref: CollectionRef, data: Record<string, unknown>) {
  const row = await request<{ id: string }>(endpointFor(ref.path), {
    method: 'POST',
    body: JSON.stringify(stripUndefined(data)),
  });
  notify(ref.path);
  return { id: row.id };
}

export async function updateDoc(ref: DocRef, data: Record<string, unknown>) {
  await request(`${endpointFor(ref.path)}/${ref.id}`, {
    method: 'PATCH',
    body: JSON.stringify(stripUndefined(data)),
  });
  notify(ref.path);
}

export async function setDoc(ref: DocRef, data: Record<string, unknown>, _opts?: { merge?: boolean }) {
  if (ref.path === 'settings') {
    await request('/api/settings', { method: 'PUT', body: JSON.stringify(stripUndefined(data)) });
  } else {
    await request(`${endpointFor(ref.path)}/${ref.id}`, { method: 'PATCH', body: JSON.stringify(stripUndefined(data)) });
  }
  notify(ref.path);
}

export async function deleteDoc(ref: DocRef) {
  await request(`${endpointFor(ref.path)}/${ref.id}`, { method: 'DELETE' });
  notify(ref.path);
}

// ------------------------- Image upload -------------------------
/**
 * Preset names must match IMAGE_PRESETS in server/index.js. The server crops to
 * that frame, so what the gym uploads no longer has to be the right shape.
 */
export type ImagePreset = 'trainer' | 'service' | 'gallery' | 'tip' | 'member' | 'hero';

export async function uploadImageToStorage(file: File, preset?: ImagePreset): Promise<string> {
  const MAX_MB = 10;
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`Image too large. Please upload a file under ${MAX_MB}MB.`);
  }
  const form = new FormData();
  form.append('file', file);
  const data = await request<{ url: string }>('/api/upload', { method: 'POST', body: form });
  return data.url;
}
