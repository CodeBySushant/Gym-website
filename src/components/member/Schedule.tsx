import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, User, Check, CalendarOff, Users } from 'lucide-react';
import { toast } from 'sonner';
import { GymClass, PtSession } from '../../types';
import { fetchSchedule, toggleClassBooking } from '../../memberApi';
import { Card, SectionHeader, Loading, EmptyState, fmtDate } from './ui';
import { cn } from '../../lib/utils';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PT_STATUS: Record<string, string> = {
  scheduled: 'bg-[#FF003C]/15 text-[#FF003C] border-[#FF003C]/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-white/5 text-white/30 border-white/10',
};

export default function Schedule() {
  const [classes, setClasses] = useState<GymClass[] | null>(null);
  const [ptSessions, setPtSessions] = useState<PtSession[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    fetchSchedule()
      .then((d) => { setClasses(d.classes); setPtSessions(d.ptSessions); })
      .catch(() => setClasses([]));

  useEffect(() => { load(); }, []);

  const onBook = async (cls: GymClass) => {
    setBusy(cls.id!);
    try {
      const { booked } = await toggleClassBooking(cls.id!);
      toast.success(booked ? `Booked into ${cls.name}` : `Cancelled your spot in ${cls.name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update booking');
    } finally {
      setBusy(null);
    }
  };

  const byDay = useMemo(() => {
    const groups = new Map<string, GymClass[]>();
    for (const c of classes || []) {
      const day = c.day || 'Unscheduled';
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(c);
    }
    return [...groups.entries()].sort(
      (a, b) => (DAY_ORDER.indexOf(a[0]) + 99) % 100 - (DAY_ORDER.indexOf(b[0]) + 99) % 100
    );
  }, [classes]);

  const todayStart = new Date(new Date().toDateString());
  const upcomingPt = ptSessions.filter((s) => new Date(s.date) >= todayStart && s.status !== 'cancelled');
  const pastPt = ptSessions.filter((s) => new Date(s.date) < todayStart || s.status === 'cancelled');

  if (classes === null) return <Loading label="Loading your schedule" />;

  return (
    <div>
      <SectionHeader title="Classes &" accent="Sessions" subtitle="Book a class or check your PT bookings" />

      {/* PT sessions */}
      <section className="mb-10">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-5">
          Personal Training
        </h2>
        {upcomingPt.length === 0 && pastPt.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No PT sessions booked"
            message="Personal training sessions booked through the front desk will show up here with the date, time and your coach."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...upcomingPt, ...pastPt].slice(0, 12).map((s) => {
              const past = new Date(s.date) < todayStart;
              return (
                <Card key={s.id} hover className={cn('p-6', past && 'opacity-50')}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FF003C]/10 border border-[#FF003C]/20 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black leading-none">{new Date(s.date).getDate()}</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-white/40 mt-0.5">
                        {new Date(s.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </div>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border', PT_STATUS[s.status] || PT_STATUS.cancelled)}>
                      {s.status}
                    </span>
                  </div>
                  <div className="font-black italic uppercase tracking-tight mb-2">
                    {s.focus || 'Personal Training'}
                  </div>
                  <div className="space-y-1.5 text-xs text-white/45">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> {fmtDate(s.date)}
                    </div>
                    {s.time && (
                      <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {s.time}</div>
                    )}
                    {s.trainerName && (
                      <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {s.trainerName}</div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Classes */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-5">
          Weekly Class Timetable
        </h2>
        {byDay.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No classes scheduled"
            message="The gym hasn't published a class timetable yet. Once they do, you'll be able to book your spot right here."
          />
        ) : (
          <div className="space-y-6">
            {byDay.map(([day, list]) => (
              <div key={day}>
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF003C] mb-3 pl-1">
                  {day}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {list.map((c) => (
                    <Card key={c.id} hover className="p-6 flex items-center justify-between gap-5">
                      <div className="min-w-0">
                        <div className="font-black italic uppercase tracking-tight text-lg mb-1.5 truncate">
                          {c.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {c.time}</span>
                          {c.trainerName && (
                            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {c.trainerName}</span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-xs text-white/30 mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onBook(c)}
                        disabled={busy === c.id}
                        className={cn(
                          'flex-shrink-0 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.15em]',
                          'transition-all duration-300 inline-flex items-center gap-2 disabled:opacity-50',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF003C]',
                          c.booked
                            ? 'bg-emerald-500 text-white hover:bg-red-500'
                            : 'bg-white/10 text-white/70 hover:bg-[#FF003C] hover:text-white'
                        )}
                      >
                        {c.booked ? (<><Check className="w-3.5 h-3.5" /> Booked</>) : 'Book'}
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
