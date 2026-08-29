import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Wallet, TrendingDown, TrendingUp, Dumbbell,
  ShieldCheck, Clock, User, ArrowRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { MemberOverview } from '../../types';
import { fetchOverview, requestRenewal } from '../../memberApi';
import {
  Card, Stat, StatusPill, SectionHeader, Button, Loading, Modal,
  Field, inputClass, fmtDate, fmtMoney,
} from './ui';

interface Props {
  onNavigate: (tab: string) => void;
}

export default function Overview({ onNavigate }: Props) {
  const [data, setData] = useState<MemberOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewNote, setRenewNote] = useState('');
  const [renewPlan, setRenewPlan] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    fetchOverview()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const submitRenewal = async () => {
    setSending(true);
    try {
      // Falls back to the current plan when the member leaves the field blank.
      await requestRenewal(renewPlan.trim() || data?.member.planName || '', renewNote);
      toast.success('Renewal request sent. The gym will contact you shortly.');
      setRenewOpen(false);
      setRenewNote('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request');
    } finally {
      setSending(false);
    }
  };

  const openRenewal = () => {
    setRenewPlan(data?.member.planName || '');
    setRenewNote('');
    setRenewOpen(true);
  };

  if (error) {
    return (
      <Card className="p-10 text-center">
        <p className="text-white/60 mb-6">{error}</p>
        <Button onClick={load} variant="ghost"><RefreshCw className="w-4 h-4" /> Retry</Button>
      </Card>
    );
  }
  if (!data) return <Loading label="Loading your dashboard" />;

  const { member, status, daysLeft, trainer, weightChange, latestMeasurement } = data;
  const firstName = member.name?.split(' ')[0] || 'Member';
  const needsRenewal = status === 'expired' || status === 'expiring';

  return (
    <div>
      <SectionHeader
        title={`Welcome back,`}
        accent={firstName}
        subtitle={member.planName ? `${member.planName} membership` : 'No active plan'}
        action={<StatusPill status={status} />}
      />

      {/* Renewal banner — the single most important thing a member needs to see */}
      {needsRenewal && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 rounded-3xl border p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6 justify-between ${
            status === 'expired'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <div className="flex items-start gap-4">
            <Clock className={`w-6 h-6 flex-shrink-0 mt-0.5 ${status === 'expired' ? 'text-red-400' : 'text-amber-400'}`} />
            <div>
              <h3 className="font-black italic uppercase tracking-tight text-lg mb-1">
                {status === 'expired' ? 'Your membership has expired' : 'Your membership expires soon'}
              </h3>
              <p className="text-sm text-white/60">
                {status === 'expired'
                  ? `Expired on ${fmtDate(member.planExpiry)}. Renew to regain full access.`
                  : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left — expires ${fmtDate(member.planExpiry)}.`}
              </p>
            </div>
          </div>
          <Button onClick={openRenewal} className="flex-shrink-0">
            Request Renewal <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <Stat
          icon={weightChange !== null && weightChange < 0 ? TrendingDown : TrendingUp}
          label="Current Weight"
          value={latestMeasurement ? `${latestMeasurement.weight}kg` : '—'}
          sub={
            weightChange !== null
              ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg since last`
              : 'No entries yet'
          }
          tone={weightChange !== null && weightChange < 0 ? 'success' : 'default'}
          delay={0}
        />
        <Stat
          icon={ShieldCheck}
          label="Days Remaining"
          value={daysLeft !== null && daysLeft > 0 ? daysLeft : 0}
          sub={member.planExpiry ? `until ${fmtDate(member.planExpiry)}` : 'no plan set'}
          tone={status === 'expired' ? 'danger' : status === 'expiring' ? 'warning' : 'success'}
          delay={0.05}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membership summary */}
        <Card className="p-8 lg:col-span-2">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">Membership</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {[
              ['Plan', member.planName || 'Not assigned'],
              ['Started', fmtDate(member.planStart)],
              ['Expires', fmtDate(member.planExpiry)],
              ['Member Since', fmtDate(member.createdAt)],
              ['Last Payment', data.lastPayment ? `${fmtMoney(data.lastPayment.amount)} · ${fmtDate(data.lastPayment.date)}` : 'None recorded'],
              ['Total Paid', fmtMoney(data.totalPaid)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 pb-4 border-b border-white/5">
                <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{label}</dt>
                <dd className="text-sm font-bold text-white/85">{value}</dd>
              </div>
            ))}
          </dl>

          {!needsRenewal && (
            <div className="mt-6">
              <Button variant="ghost" onClick={openRenewal}>
                <RefreshCw className="w-4 h-4" /> Request Early Renewal
              </Button>
            </div>
          )}
        </Card>

        {/* Trainer */}
        <Card className="p-8 flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">Your Trainer</h3>
          {trainer ? (
            <>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0">
                  {trainer.imageUrl ? (
                    <img src={trainer.imageUrl} alt={trainer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-7 h-7 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-black italic uppercase tracking-tight truncate">{trainer.name}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF003C] mt-1">
                    {trainer.specialization}
                  </div>
                </div>
              </div>
              {trainer.quote && (
                <p className="text-sm text-white/50 italic leading-relaxed border-t border-white/10 pt-5">
                  &ldquo;{trainer.quote}&rdquo;
                </p>
              )}
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center py-6">
              <User className="w-9 h-9 text-white/15 mb-4" />
              <p className="text-sm text-white/35 leading-relaxed">
                No trainer assigned yet. Ask at the front desk to get matched with a coach.
              </p>
            </div>
          )}

        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { tab: 'workout', icon: Dumbbell, label: 'Workout Plan' },
          { tab: 'progress', icon: TrendingUp, label: 'Log Progress' },
          { tab: 'payments', icon: Wallet, label: 'Invoices' },
        ].map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className="group bg-white/5 border border-white/10 rounded-2xl p-5 text-left hover:border-[#FF003C]/50 hover:bg-white/[0.07] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF003C]"
          >
            <Icon className="w-5 h-5 text-[#FF003C] mb-3" />
            <div className="text-xs font-black uppercase tracking-[0.15em] text-white/70 group-hover:text-white transition-colors">
              {label}
            </div>
          </button>
        ))}
      </div>

      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Request Renewal">
        <div className="space-y-6">
          <p className="text-sm text-white/50 leading-relaxed">
            This sends a request to the gym. The team will contact you on{' '}
            <span className="text-white font-bold">+{member.phone}</span> to confirm your plan and collect payment.
          </p>
          <Field label="Plan you want" hint="Leave blank to continue on your current plan.">
            <input
              className={inputClass}
              value={renewPlan}
              onChange={(e) => setRenewPlan(e.target.value)}
              placeholder="e.g. Quarterly"
              maxLength={80}
            />
          </Field>
          <Field label="Anything to add? (optional)">
            <textarea
              className={`${inputClass} h-24 resize-none`}
              value={renewNote}
              onChange={(e) => setRenewNote(e.target.value)}
              placeholder="e.g. I'd like to switch to the annual plan"
              maxLength={300}
            />
          </Field>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setRenewOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={submitRenewal} disabled={sending} className="flex-1">
              {sending ? 'Sending…' : 'Send Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
