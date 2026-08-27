import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard, CalendarCheck, Wallet, Dumbbell, Apple, TrendingUp,
  CalendarDays, LogOut, Menu, X, KeyRound, Home, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Member } from '../types';
import { memberLogout, changePassword, onMemberChanged } from '../memberApi';
import { BRAND } from '../config';
import { cn } from '../lib/utils';
import { Modal, Field, inputClass, Button, StatusPill } from '../components/member/ui';
import Overview from '../components/member/Overview';
import Attendance from '../components/member/Attendance';
import Payments from '../components/member/Payments';
import Workout from '../components/member/Workout';
import Diet from '../components/member/Diet';
import Progress from '../components/member/Progress';
import Schedule from '../components/member/Schedule';

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workout', label: 'Workout Plan', icon: Dumbbell },
  { id: 'diet', label: 'Diet Plan', icon: Apple },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'schedule', label: 'Classes & PT', icon: CalendarDays },
  { id: 'payments', label: 'Payments', icon: Wallet },
];

export default function MemberPortal({ member }: { member: Member }) {
  const [tab, setTab] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Prompt a password change on first login, since the admin set the initial one.
  useEffect(() => {
    if (member.mustChangePassword) {
      const t = setTimeout(() => setPwOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, [member.mustChangePassword]);

  // If the session dies mid-use (expired token), bounce to login.
  useEffect(() => onMemberChanged((m) => { if (!m) navigate('/member/login', { replace: true }); }), [navigate]);

  const logout = () => {
    memberLogout();
    toast.success('Signed out');
    navigate('/');
  };

  const submitPassword = async () => {
    if (pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pw.next !== pw.confirm) { toast.error('New passwords do not match'); return; }
    setSaving(true);
    try {
      await changePassword(pw.current, pw.next);
      toast.success('Password updated');
      setPwOpen(false);
      setPw({ current: '', next: '', confirm: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  const go = (next: string) => { setTab(next); setNavOpen(false); window.scrollTo({ top: 0 }); };

  const sections: Record<string, React.ReactNode> = {
    overview: <Overview onNavigate={go} />,
    workout: <Workout />,
    diet: <Diet />,
    progress: <Progress />,
    attendance: <Attendance />,
    schedule: <Schedule />,
    payments: <Payments member={member} />,
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex selection:bg-[#FF003C] selection:text-white">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-black tracking-tighter uppercase italic">
          {BRAND.first} <span className="text-[#FF003C]">Portal</span>
        </Link>
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="bg-[#FF003C] p-2.5 rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {navOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'w-72 bg-black border-r border-white/10 flex flex-col h-screen fixed top-0 left-0 z-50 flex-shrink-0',
          'transition-transform duration-400 ease-in-out lg:static lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tighter uppercase italic">
            {BRAND.first} <span className="text-[#FF003C]">Portal</span>
          </Link>
          <button onClick={() => setNavOpen(false)} aria-label="Close menu" className="text-white/40 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member card */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF003C] flex items-center justify-center font-black italic text-lg overflow-hidden flex-shrink-0">
              {member.photoUrl
                ? <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                : (member.name?.[0]?.toUpperCase() || <User className="w-5 h-5" />)}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{member.name}</div>
              <div className="text-[10px] text-white/35 font-medium">+{member.phone}</div>
            </div>
          </div>
          {member.status && <StatusPill status={member.status} />}
        </div>

        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto no-scrollbar" aria-label="Member sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.12em]',
                'transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF003C]',
                tab === t.id
                  ? 'bg-[#FF003C] text-white shadow-[0_0_20px_rgba(255,0,60,0.35)]'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              <t.icon className={cn('w-4.5 h-4.5 transition-transform', tab === t.id && 'scale-110')} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1.5">
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.12em] text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <Home className="w-4 h-4" /> Main Site
          </Link>
          <button
            onClick={() => setPwOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.12em] text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            <KeyRound className="w-4 h-4" /> Change Password
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-[0.12em] text-white/40 hover:text-[#FF003C] hover:bg-[#FF003C]/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-grow h-screen overflow-y-auto custom-scrollbar p-5 sm:p-8 lg:p-10 pt-24 lg:pt-10 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="max-w-6xl mx-auto"
          >
            {sections[tab]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Change password */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change Password">
        <div className="space-y-5">
          {member.mustChangePassword && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-xs text-amber-300/90 leading-relaxed">
              You&rsquo;re using the password the gym set for you. Please choose your own.
            </div>
          )}
          <Field label="Current Password">
            <input type="password" className={inputClass} value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          </Field>
          <Field label="New Password" hint="At least 6 characters.">
            <input type="password" className={inputClass} value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label="Confirm New Password">
            <input type="password" className={inputClass} value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
          </Field>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setPwOpen(false)} className="flex-1">Later</Button>
            <Button onClick={submitPassword} disabled={saving} className="flex-1">
              {saving ? 'Saving…' : 'Update Password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
