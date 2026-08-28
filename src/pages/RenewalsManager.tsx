/**
 * Admin → Renewals
 *
 * Members can request a renewal from their portal (Overview → Request
 * Renewal), which writes to the renewal_requests collection. The backend route
 * existed from the start, but nothing in the admin panel ever read it — so
 * every request a member sent disappeared. This screen is that missing half.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Phone, MessageCircle, Inbox, Clock, StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { RenewalRequest } from '../types';
import { adminRequest, J } from '../adminApi';
import { cn } from '../lib/utils';
import { Card, Button, Loading, EmptyState, fmtDate } from '../components/member/ui';

const STATUSES = ['pending', 'contacted', 'completed', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<Status, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  contacted: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-white/5 text-white/30 border-white/10',
};

export default function RenewalsManager() {
  const [rows, setRows] = useState<RenewalRequest[] | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    adminRequest<RenewalRequest[]>('/api/admin/renewal-requests')
      .then(setRows)
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not load renewal requests');
        setRows([]);
      });

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: (rows || []).length };
    for (const s of STATUSES) c[s] = (rows || []).filter((r) => r.status === s).length;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === 'all' ? rows || [] : (rows || []).filter((r) => r.status === filter)),
    [rows, filter]
  );

  const setStatus = async (r: RenewalRequest, status: Status) => {
    setBusy(r.id!);
    try {
      await adminRequest(`/api/admin/renewal-requests/${r.id}`, { method: 'PATCH', body: J({ status }) });
      toast.success(`Marked as ${status}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  };

  if (rows === null) return <Loading label="Loading renewal requests" />;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Renewal <span className="text-[#FF003C]">Requests</span>
          </h1>
          <p className="text-white/40 font-medium uppercase tracking-widest text-xs mt-2">
            Members asking to extend their membership
          </p>
        </div>
        <Button variant="ghost" onClick={load}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {(['all', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border-2 transition-all',
              filter === s
                ? 'bg-[#FF003C] border-[#FF003C] text-white'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/25'
            )}
          >
            {s} · {counts[s] ?? 0}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'pending' ? 'No pending requests' : `No ${filter} requests`}
          message="When a member taps Request Renewal in their portal, it lands here with their name, number and plan so you can call them back."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((r) => {
            const status = (r.status || 'pending') as Status;
            const phone = (r.memberPhone || '').replace(/\D/g, '');
            return (
              <Card key={r.id} hover className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <div className="font-black italic uppercase tracking-tight text-lg truncate">
                      {r.memberName || 'Member'}
                    </div>
                    {phone && <div className="text-[11px] text-white/35 font-medium mt-0.5">+{phone}</div>}
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border',
                      STATUS_STYLE[status]
                    )}
                  >
                    {status}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <dt className="text-white/25 font-bold uppercase text-[9px] tracking-widest">Plan wanted</dt>
                    <dd className="font-bold mt-0.5 truncate">{r.planName || 'Current plan'}</dd>
                  </div>
                  <div>
                    <dt className="text-white/25 font-bold uppercase text-[9px] tracking-widest">Requested</dt>
                    <dd className="font-bold mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-white/30" /> {fmtDate(r.createdAt)}
                    </dd>
                  </div>
                </dl>

                {r.note && (
                  <div className="flex items-start gap-3 bg-black/40 border border-white/5 rounded-2xl p-4 mb-4">
                    <StickyNote className="w-4 h-4 text-[#FF003C] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/60 leading-relaxed">{r.note}</p>
                  </div>
                )}

                {/* Contact shortcuts — the whole point is to call them back fast */}
                {phone && (
                  <div className="flex gap-2 mb-4">
                    <a
                      href={`tel:+${phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/30 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a
                      href={`https://wa.me/${phone}?text=${encodeURIComponent(
                        `Hi ${r.memberName || ''}, about your membership renewal request —`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/25 text-[10px] font-black uppercase tracking-widest text-green-400 hover:bg-green-500 hover:text-white transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  {STATUSES.filter((s) => s !== status).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(r, s)}
                      disabled={busy === r.id}
                      className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                    >
                      Mark {s}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-white/25 leading-relaxed max-w-2xl">
        Marking a request completed does not extend the membership on its own. Record the payment in
        Members → the member → Payments with a <span className="text-white/40">Period To</span> date —
        that is what rolls their expiry forward.
      </p>
    </div>
  );
}
