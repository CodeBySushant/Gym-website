/**
 * Shared building blocks for the member portal.
 *
 * Design notes: the portal keeps the marketing site's identity (black surfaces,
 * #FF003C accent, italic-black headings) but uses a calmer, denser rhythm —
 * data screens need legibility more than drama. Spacing follows an 8px grid.
 */
import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { MembershipStatus } from '../../types';

export const ACCENT = '#FF003C';

/* ------------------------------ Section header ------------------------------ */
export function SectionHeader({
  title,
  accent,
  subtitle,
  action,
}: {
  title: string;
  accent?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">
          {title} {accent && <span className="text-[#FF003C]">{accent}</span>}
        </h1>
        {subtitle && (
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/* ------------------------------ Card ------------------------------ */
export function Card({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-3xl transition-all duration-300',
        hover && 'hover:border-white/20 hover:bg-white/[0.07]',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Stat tile ------------------------------ */
export function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
  delay = 0,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  delay?: number;
  className?: string;
}) {
  const tones = {
    default: 'bg-white/10 text-white',
    accent: 'bg-[#FF003C] text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-amber-500 text-black',
    danger: 'bg-red-600 text-white',
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={className}
    >
      <Card hover className="p-6 h-full">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center mb-5 shadow-lg', tones[tone])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-3xl font-black italic leading-none mb-2 tabular-nums">{value}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{label}</div>
        {sub && <div className="text-xs text-white/30 mt-2 font-medium">{sub}</div>}
      </Card>
    </motion.div>
  );
}

/* ------------------------------ Status pill ------------------------------ */
const STATUS_STYLES: Record<MembershipStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  expiring: { label: 'Expiring Soon', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  expired: { label: 'Expired', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  frozen: { label: 'Frozen', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  none: { label: 'No Plan', className: 'bg-white/10 text-white/50 border-white/20' },
};

export function StatusPill({ status, className }: { status: MembershipStatus; className?: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.none;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em]',
        s.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

/* ------------------------------ Empty state ------------------------------ */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
        <Icon className="w-7 h-7 text-white/25" />
      </div>
      <h3 className="text-lg font-black italic uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

/* ------------------------------ Buttons ------------------------------ */
export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C]',
    ghost: 'bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/30',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white',
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-6 py-3 rounded-full text-xs font-black uppercase tracking-[0.15em]',
        'transition-all duration-300 inline-flex items-center justify-center gap-2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF003C]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-inherit',
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------ Field ------------------------------ */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-white/25 mt-1.5 font-medium">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white ' +
  'placeholder:text-white/20 focus:border-[#FF003C] focus:outline-none transition-colors';

/* ------------------------------ Modal ------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  // Escape-to-close, and lock body scroll while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative bg-[#0A0A0A] border border-white/10 rounded-3xl w-full',
          'max-h-[88vh] overflow-y-auto custom-scrollbar',
          wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 px-8 py-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-black italic uppercase tracking-tighter">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/30 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            &times;
          </button>
        </div>
        <div className="p-8">{children}</div>
      </motion.div>
    </div>
  );
}

/* ------------------------------ Loading ------------------------------ */
export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-[#FF003C]" />
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{label}</span>
    </div>
  );
}

/* ------------------------------ Formatters ------------------------------ */
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateShort = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

export const fmtMoney = (n?: number | null) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—';
