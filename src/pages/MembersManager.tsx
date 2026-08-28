/**
 * Admin → Members
 *
 * The counterpart to the member portal: create members, record attendance and
 * payments, assign workout/diet plans, and see everything about one person.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Trash2, Edit2, KeyRound, CalendarCheck, Wallet, Dumbbell,
  Apple, X, Users, UserPlus, RefreshCw, Check, Ruler, Camera, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Member, Payment, AttendanceRow, WorkoutPlan, DietPlan, Measurement, Trainer } from '../types';
import { getDocs, collection, db, uploadImageToStorage } from '../api';
import { adminRequest, J } from '../adminApi';
import { cn } from '../lib/utils';
import {
  Card, Stat, StatusPill, Button, Modal, Field, inputClass,
  Loading, EmptyState, fmtDate, fmtMoney,
} from '../components/member/ui';



const EMPTY: Partial<Member> = {
  name: '', phone: '', email: '', photoUrl: '', planName: '', planStart: '', planExpiry: '',
  trainerId: '', emergencyContact: '', address: '', notes: '', active: true,
};

const toInputDate = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function MembersManager() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [password, setPassword] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [pwReset, setPwReset] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = () => {
    adminRequest<Member[]>('/api/admin/members').then(setMembers).catch((e) => { toast.error(e.message); setMembers([]); });
    adminRequest<any>('/api/admin/member-stats').then(setStats).catch(() => {});
  };

  useEffect(() => {
    load();
    getDocs(collection(db, 'trainers'))
      .then((s) => setTrainers(s.docs.map((d) => ({ id: d.id, ...d.data() } as Trainer))))
      .catch(() => setTrainers([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members || [];
    return (members || []).filter(
      (m) => m.name?.toLowerCase().includes(q) || m.phone?.includes(q.replace(/\D/g, ''))
    );
  }, [members, search]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: any = { ...editing };
      delete payload.id; delete payload.status; delete payload.daysLeft;
      if (editing.id) {
        await adminRequest(`/api/admin/members/${editing.id}`, { method: 'PATCH', body: J(payload) });
        toast.success('Member updated');
      } else {
        await adminRequest('/api/admin/members', { method: 'POST', body: J({ ...payload, password }) });
        toast.success('Member created');
      }
      setEditing(null); setPassword(''); load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Member) => {
    try {
      await adminRequest(`/api/admin/members/${m.id}`, { method: 'DELETE' });
      toast.success(`${m.name} removed`);
      setConfirmDelete(null); load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  const resetPassword = async () => {
    if (!pwReset || password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      await adminRequest(`/api/admin/members/${pwReset.id}/password`, { method: 'POST', body: J({ password }) });
      toast.success(`Password reset. Share it with ${pwReset.name}.`);
      setPwReset(null); setPassword('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reset');
    }
  };

  if (members === null) return <Loading label="Loading members" />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">
          Manage <span className="text-[#FF003C]">Members</span>
        </h1>
        <Button onClick={() => { setEditing({ ...EMPTY }); setPassword(''); }}>
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </header>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat icon={Users} label="Total" value={stats.total} />
          <Stat icon={Check} label="Active" value={stats.active} tone="success" delay={0.05} />
          <Stat icon={RefreshCw} label="Expiring" value={stats.expiring} tone="warning" delay={0.1} />
          <Stat icon={X} label="Expired" value={stats.expired} tone="danger" delay={0.15} />
          <Stat icon={CalendarCheck} label="In Today" value={stats.checkedInToday} tone="accent" delay={0.2} className="col-span-2 lg:col-span-1" />
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          className={`${inputClass} pl-12 rounded-2xl py-4`}
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={search ? 'No members match that search' : 'No members yet'}
          message={search ? 'Try a different name or phone number.' : 'Add your first member to give them portal access.'}
          action={!search && <Button onClick={() => { setEditing({ ...EMPTY }); setPassword(''); }}><Plus className="w-4 h-4" /> Add Member</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Card key={m.id} hover className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF003C] flex items-center justify-center font-black italic overflow-hidden flex-shrink-0">
                    {m.photoUrl ? <img src={m.photoUrl} alt="" className="w-full h-full object-cover" /> : m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black italic uppercase tracking-tight truncate">{m.name}</div>
                    <div className="text-[11px] text-white/35 font-medium">+{m.phone}</div>
                  </div>
                </div>
                <StatusPill status={m.status || 'none'} />
              </div>

              <dl className="grid grid-cols-2 gap-3 mb-5 text-xs">
                <div><dt className="text-white/25 font-bold uppercase text-[9px] tracking-widest">Plan</dt><dd className="font-bold mt-0.5 truncate">{m.planName || '—'}</dd></div>
                <div><dt className="text-white/25 font-bold uppercase text-[9px] tracking-widest">Expires</dt><dd className="font-bold mt-0.5">{fmtDate(m.planExpiry)}</dd></div>
              </dl>

              <div className="flex gap-2 pt-4 border-t border-white/5">
                <button onClick={() => setDetailId(m.id!)} className="flex-grow text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF003C] transition-colors py-2">
                  View Details
                </button>
                <button onClick={() => { setEditing({ ...m, planStart: toInputDate(m.planStart), planExpiry: toInputDate(m.planExpiry) }); }} aria-label="Edit" className="p-2 rounded-lg hover:bg-white/10 hover:text-[#FF003C] transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { setPwReset(m); setPassword(''); }} aria-label="Reset password" className="p-2 rounded-lg hover:bg-white/10 hover:text-amber-400 transition-colors"><KeyRound className="w-4 h-4" /></button>
                <button onClick={() => setConfirmDelete(m)} aria-label="Delete" className="p-2 rounded-lg hover:bg-white/10 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal open={!!editing} onClose={() => { setEditing(null); setPassword(''); }} title={editing?.id ? 'Edit Member' : 'Add Member'} wide>
        {editing && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <input className={inputClass} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Phone Number *" hint="Used to log in. Include country code, e.g. 918305213300">
                <input className={inputClass} value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
              <Field label="Email"><input className={inputClass} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Emergency Contact"><input className={inputClass} value={editing.emergencyContact || ''} onChange={(e) => setEditing({ ...editing, emergencyContact: e.target.value })} /></Field>
              <Field label="Plan Name"><input className={inputClass} value={editing.planName || ''} onChange={(e) => setEditing({ ...editing, planName: e.target.value })} placeholder="e.g. Quarterly" /></Field>
              <Field label="Assigned Trainer">
                <select className={inputClass} value={editing.trainerId || ''} onChange={(e) => setEditing({ ...editing, trainerId: e.target.value })}>
                  <option value="">None</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Plan Start"><input type="date" className={inputClass} value={editing.planStart || ''} onChange={(e) => setEditing({ ...editing, planStart: e.target.value })} /></Field>
              <Field label="Plan Expiry" hint="Drives the member's status badge."><input type="date" className={inputClass} value={editing.planExpiry || ''} onChange={(e) => setEditing({ ...editing, planExpiry: e.target.value })} /></Field>
            </div>

            <Field label="Member Photo" hint="Optional. Shown on their portal and on the card here.">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {editing.photoUrl
                    ? <img src={editing.photoUrl} alt="" className="w-full h-full object-cover" />
                    : <User className="w-7 h-7 text-white/20" />}
                </div>
                <label className="flex-grow bg-black border border-dashed border-white/15 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF003C] transition-colors">
                  <Camera className="w-5 h-5 text-white/40 mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {uploadingPhoto ? 'Uploading…' : editing.photoUrl ? 'Replace Photo' : 'Upload Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setUploadingPhoto(true);
                      try {
                        const url = await uploadImageToStorage(file);
                        setEditing((prev) => (prev ? { ...prev, photoUrl: url } : prev));
                        toast.success('Photo uploaded');
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Upload failed');
                      } finally {
                        setUploadingPhoto(false);
                      }
                    }}
                  />
                </label>
                {editing.photoUrl && (
                  <Button variant="ghost" onClick={() => setEditing({ ...editing, photoUrl: '' })} className="flex-shrink-0">
                    Remove
                  </Button>
                )}
              </div>
            </Field>

            <Field label="Address"><input className={inputClass} value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
            <Field label="Internal Notes" hint="Only visible to admins."><textarea className={`${inputClass} h-20 resize-none`} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>

            {!editing.id && (
              <Field label="Initial Password *" hint="Share this with the member. They'll be asked to change it on first login.">
                <div className="flex gap-2">
                  <input className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                  <Button variant="ghost" onClick={() => setPassword(Math.random().toString(36).slice(-8))} className="flex-shrink-0">Generate</Button>
                </div>
              </Field>
            )}

            <label className="flex items-center gap-3 cursor-pointer group pt-2">
              <div className={cn('w-5 h-5 rounded border flex items-center justify-center transition-all', editing.frozen ? 'bg-sky-500 border-sky-500' : 'bg-black border-white/15 group-hover:border-white/30')}>
                {editing.frozen && <Check className="w-3 h-3" />}
              </div>
              <input type="checkbox" className="hidden" checked={!!editing.frozen} onChange={(e) => setEditing({ ...editing, frozen: e.target.checked })} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Freeze membership</span>
            </label>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={() => { setEditing(null); setPassword(''); }} className="flex-1">Cancel</Button>
              <Button onClick={save} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Member'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Password reset */}
      <Modal open={!!pwReset} onClose={() => { setPwReset(null); setPassword(''); }} title="Reset Password">
        <div className="space-y-5">
          <p className="text-sm text-white/50 leading-relaxed">
            Set a new password for <span className="text-white font-bold">{pwReset?.name}</span>.
            They&rsquo;ll be prompted to change it when they next sign in.
          </p>
          <Field label="New Password">
            <div className="flex gap-2">
              <input className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              <Button variant="ghost" onClick={() => setPassword(Math.random().toString(36).slice(-8))} className="flex-shrink-0">Generate</Button>
            </div>
          </Field>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setPwReset(null); setPassword(''); }} className="flex-1">Cancel</Button>
            <Button onClick={resetPassword} className="flex-1">Reset Password</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Member">
        <p className="text-sm text-white/50 mb-8 leading-relaxed">
          This permanently removes <span className="text-white font-bold">{confirmDelete?.name}</span> along with
          all their attendance, payments, plans, measurements and photos. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete && remove(confirmDelete)} className="flex-1">Delete Permanently</Button>
        </div>
      </Modal>

      {detailId && <MemberDetail id={detailId} onClose={() => { setDetailId(null); load(); }} />}
    </div>
  );
}

/* ============================ Member detail ============================ */
function MemberDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'attendance' | 'payments' | 'workout' | 'diet' | 'body'>('attendance');
  const [busy, setBusy] = useState(false);

  const load = () => { adminRequest<any>(`/api/admin/members/${id}/detail`).then(setData).catch((e) => toast.error(e.message)); };
  useEffect(load, [id]);

  const markAttendance = async () => {
    setBusy(true);
    try {
      await adminRequest('/api/admin/attendance', { method: 'POST', body: J({ memberId: id }) });
      toast.success('Attendance marked');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark');
    } finally { setBusy(false); }
  };

  const TABS = [
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'diet', label: 'Diet', icon: Apple },
    { id: 'body', label: 'Body', icon: Ruler },
  ] as const;

  return (
    <Modal open onClose={onClose} title={data?.member?.name || 'Member'} wide>
      {!data ? <Loading /> : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={data.member.status} />
            <span className="text-xs text-white/40">+{data.member.phone}</span>
            <span className="text-xs text-white/40">·</span>
            <span className="text-xs text-white/40">{data.member.planName || 'No plan'} · expires {fmtDate(data.member.planExpiry)}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center"><div className="text-2xl font-black italic">{data.attendanceSummary.streak}</div><div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">Streak</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-black italic">{data.attendanceSummary.thisMonth}</div><div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">This Month</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-black italic">{fmtMoney(data.payments.reduce((s: number, p: Payment) => s + (Number(p.amount) || 0), 0))}</div><div className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">Total Paid</div></Card>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-white/10 pb-3">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2',
                  tab === t.id ? 'bg-[#FF003C] text-white' : 'text-white/40 hover:text-white hover:bg-white/5')}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'attendance' && (
            <div>
              <Button onClick={markAttendance} disabled={busy} className="mb-4">
                <CalendarCheck className="w-4 h-4" /> {busy ? 'Marking…' : 'Mark Present Today'}
              </Button>
              {data.attendance.length === 0 ? (
                <p className="text-sm text-white/30 py-6 text-center">No attendance recorded yet.</p>
              ) : (
                <ul className="divide-y divide-white/5 max-h-64 overflow-y-auto custom-scrollbar">
                  {data.attendance.map((a: AttendanceRow) => (
                    <li key={a.id} className="py-3 flex justify-between text-sm">
                      <span className="text-white/70">{fmtDate(a.date)}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70">Present</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'payments' && <PaymentsTab memberId={id} payments={data.payments} onSaved={load} />}
          {tab === 'workout' && <PlanTab kind="workout" memberId={id} plan={data.workoutPlan} onSaved={load} />}
          {tab === 'diet' && <PlanTab kind="diet" memberId={id} plan={data.dietPlan} onSaved={load} />}
          {tab === 'body' && <BodyTab memberId={id} rows={data.measurements} onSaved={load} />}
        </div>
      )}
    </Modal>
  );
}

/* ---------- Payments ---------- */
function PaymentsTab({ memberId, payments, onSaved }: { memberId: string; payments: Payment[]; onSaved: () => void }) {
  const [form, setForm] = useState({ amount: '', planName: '', method: 'cash', periodFrom: '', periodTo: '' });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.amount) { toast.error('Enter an amount'); return; }
    setSaving(true);
    try {
      await adminRequest('/api/admin/payments', { method: 'POST', body: J({ ...form, memberId, amount: Number(form.amount) }) });
      toast.success('Payment recorded' + (form.periodTo ? ' — membership extended' : ''));
      setForm({ amount: '', planName: '', method: 'cash', periodFrom: '', periodTo: '' });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Record a Payment</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹) *"><input type="number" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Method">
            <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="cash">Cash</option><option value="upi">UPI</option>
              <option value="card">Card</option><option value="bank">Bank Transfer</option>
            </select>
          </Field>
          <Field label="Plan Name"><input className={inputClass} value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} placeholder="e.g. Quarterly" /></Field>
          <Field label="Period From"><input type="date" className={inputClass} value={form.periodFrom} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })} /></Field>
          <Field label="Period To" hint="Setting this extends the membership expiry."><input type="date" className={inputClass} value={form.periodTo} onChange={(e) => setForm({ ...form, periodTo: e.target.value })} /></Field>
        </div>
        <Button onClick={add} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</Button>
      </Card>

      {payments.length === 0 ? (
        <p className="text-sm text-white/30 py-6 text-center">No payments recorded.</p>
      ) : (
        <ul className="divide-y divide-white/5 max-h-56 overflow-y-auto custom-scrollbar">
          {payments.map((p) => (
            <li key={p.id} className="py-3 flex justify-between items-center text-sm">
              <div>
                <div className="font-mono text-[10px] text-[#FF003C]">{p.invoiceNo}</div>
                <div className="text-white/60 text-xs mt-0.5">{p.planName || 'Membership'} · {fmtDate(p.date)}</div>
              </div>
              <span className="font-black italic">{fmtMoney(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Workout / Diet plans (JSON-backed simple editor) ---------- */
function PlanTab({ kind, memberId, plan, onSaved }: { kind: 'workout' | 'diet'; memberId: string; plan: WorkoutPlan | DietPlan | null; onSaved: () => void }) {
  const isWorkout = kind === 'workout';
  const [title, setTitle] = useState(plan?.title || (isWorkout ? 'Workout Plan' : 'Diet Plan'));
  const [notes, setNotes] = useState(plan?.notes || '');
  const [raw, setRaw] = useState(() =>
    JSON.stringify(
      isWorkout
        ? (plan as WorkoutPlan)?.days || [{ day: 'Day 1', focus: 'Push', exercises: [{ name: 'Bench Press', sets: '4', reps: '8-10' }] }]
        : (plan as DietPlan)?.meals || [{ time: '8:00 AM', name: 'Breakfast', items: ['4 egg whites', '2 rotis'], calories: 450 }],
      null, 2
    )
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { toast.error('The structure below is not valid JSON. Check for a missing comma or bracket.'); return; }
    if (!Array.isArray(parsed)) { toast.error('The structure must be a list, wrapped in [ ]'); return; }
    setSaving(true);
    try {
      await adminRequest(`/api/admin/members/${memberId}/${isWorkout ? 'workout-plan' : 'diet-plan'}`, {
        method: 'PUT',
        body: J(isWorkout ? { title, notes, days: parsed } : { title, notes, meals: parsed }),
      });
      toast.success('Plan saved');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Field label="Plan Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field
        label={isWorkout ? 'Days & Exercises' : 'Meals'}
        hint={isWorkout
          ? 'Each day needs: day, focus, exercises[{ name, sets, reps, notes }]'
          : 'Each meal needs: time, name, items[], calories'}
      >
        <textarea className={`${inputClass} h-64 font-mono text-xs leading-relaxed`} value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />
      </Field>
      <Field label="Notes for the member"><textarea className={`${inputClass} h-20 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Plan'}</Button>
    </div>
  );
}

/* ---------- Body measurements ---------- */
function BodyTab({ memberId, rows, onSaved }: { memberId: string; rows: Measurement[]; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const FIELDS = ['weight', 'chest', 'waist', 'hips', 'arms', 'thighs', 'bodyFat'];

  const add = async () => {
    if (!form.weight) { toast.error('Weight is required'); return; }
    setSaving(true);
    try {
      await adminRequest(`/api/admin/members/${memberId}/measurements`, {
        method: 'POST',
        body: J(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]))),
      });
      toast.success('Measurement recorded');
      setForm({}); onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Record Measurements</h4>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {FIELDS.map((f) => (
            <Field key={f} label={f === 'bodyFat' ? 'Body Fat %' : f[0].toUpperCase() + f.slice(1)}>
              <input type="number" step="0.1" className={inputClass} value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </Field>
          ))}
        </div>
        <Button onClick={add} disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button>
      </Card>
      {rows.length > 0 && (
        <ul className="divide-y divide-white/5 max-h-48 overflow-y-auto custom-scrollbar">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex justify-between text-sm">
              <span className="text-white/60">{fmtDate(r.date)}</span>
              <span className="font-black italic">{r.weight}kg</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
