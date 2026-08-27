import { useEffect, useState } from 'react';
import { Dumbbell, Check, Flame, CalendarDays, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { WorkoutPlan, WorkoutLog } from '../../types';
import { fetchWorkoutPlan, toggleWorkoutLog } from '../../memberApi';
import { Card, SectionHeader, Loading, EmptyState, Stat, fmtDateShort } from './ui';
import { cn } from '../../lib/utils';

const isToday = (d: string | Date) => new Date(d).toDateString() === new Date().toDateString();

export default function Workout() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<number>(0);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () =>
    fetchWorkoutPlan()
      .then((d) => { setPlan(d.plan); setLogs(d.logs); })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const loggedToday = (day: string) => logs.some((l) => l.day === day && isToday(l.date));

  const onToggle = async (day: string) => {
    setSaving(day);
    try {
      const { logged } = await toggleWorkoutLog(day);
      toast.success(logged ? 'Workout logged. Nice one.' : 'Workout unmarked.');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Loading label="Loading your plan" />;

  if (!plan || !plan.days?.length) {
    return (
      <div>
        <SectionHeader title="Your" accent="Workout Plan" />
        <EmptyState
          icon={Dumbbell}
          title="No plan assigned yet"
          message="Your trainer hasn't built your programme yet. Once they do, every session and exercise shows up here with sets and reps."
        />
      </div>
    );
  }

  const thisWeek = logs.filter((l) => {
    const diff = (Date.now() - new Date(l.date).getTime()) / 86400000;
    return diff <= 7;
  }).length;

  return (
    <div>
      <SectionHeader
        title="Your"
        accent="Workout Plan"
        subtitle={plan.title}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Stat icon={CalendarDays} label="Sessions / Week" value={plan.days.length} sub="in your split" />
        <Stat icon={Check} label="Logged This Week" value={thisWeek} sub="workouts completed" tone={thisWeek >= 3 ? 'success' : 'default'} delay={0.05} />
        <Stat icon={Flame} label="All Time" value={logs.length} sub="workouts logged" delay={0.1} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {plan.days.map((d, i) => {
          const done = loggedToday(d.day);
          return (
            <button
              key={i}
              onClick={() => setOpenDay(i)}
              className={cn(
                'flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all duration-300 text-left min-w-[140px]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF003C]',
                openDay === i
                  ? 'bg-[#FF003C] border-[#FF003C] text-white'
                  : 'bg-white/5 border-white/10 text-white/50 hover:border-white/25'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest">{d.day}</span>
                {done && <Check className="w-3.5 h-3.5" />}
              </div>
              {d.focus && (
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mt-1', openDay === i ? 'text-white/70' : 'text-white/30')}>
                  {d.focus}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Exercises */}
      {plan.days[openDay] && (
        <Card className="overflow-hidden mb-6">
          <div className="px-6 sm:px-8 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tight">
                {plan.days[openDay].day}
              </h3>
              {plan.days[openDay].focus && (
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF003C] mt-1">
                  {plan.days[openDay].focus}
                </p>
              )}
            </div>
            <button
              onClick={() => onToggle(plan.days[openDay].day)}
              disabled={saving === plan.days[openDay].day}
              className={cn(
                'px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300',
                'inline-flex items-center gap-2 disabled:opacity-50',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF003C]',
                loggedToday(plan.days[openDay].day)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-[#FF003C] hover:text-white'
              )}
            >
              <Check className="w-4 h-4" />
              {loggedToday(plan.days[openDay].day) ? 'Done Today' : 'Mark as Done'}
            </button>
          </div>

          <ul className="divide-y divide-white/5">
            {(plan.days[openDay].exercises || []).map((ex, i) => (
              <li key={i} className="px-6 sm:px-8 py-5 flex items-start gap-5 hover:bg-white/[0.03] transition-colors">
                <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-black text-white/40 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-sm mb-1">{ex.name}</div>
                  {ex.notes && <div className="text-xs text-white/35 leading-relaxed">{ex.notes}</div>}
                </div>
                <div className="flex gap-6 flex-shrink-0 text-right">
                  {ex.sets && (
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/25">Sets</div>
                      <div className="text-sm font-black italic tabular-nums">{ex.sets}</div>
                    </div>
                  )}
                  {ex.reps && (
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/25">Reps</div>
                      <div className="text-sm font-black italic tabular-nums">{ex.reps}</div>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {!(plan.days[openDay].exercises || []).length && (
              <li className="px-8 py-10 text-center text-sm text-white/30">
                No exercises listed for this day.
              </li>
            )}
          </ul>
        </Card>
      )}

      {plan.notes && (
        <Card className="p-6 sm:p-8 mb-6">
          <div className="flex items-start gap-4">
            <StickyNote className="w-5 h-5 text-[#FF003C] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                Trainer&rsquo;s Notes
              </h4>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{plan.notes}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent activity */}
      {logs.length > 0 && (
        <Card className="p-6 sm:p-8">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-5">Recently Logged</h3>
          <div className="flex flex-wrap gap-2">
            {logs.slice(0, 24).map((l, i) => (
              <span
                key={l.id || i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                {l.day} · {fmtDateShort(l.date)}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
