import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Flame, TrendingUp, CalendarX } from 'lucide-react';
import { AttendanceRow, AttendanceSummary } from '../../types';
import { fetchAttendance } from '../../memberApi';
import { Card, Stat, SectionHeader, Loading, EmptyState, fmtDate } from './ui';

/** Builds the trailing-N-weeks grid used by the heatmap. */
function buildHeatmap(dates: Set<string>, weeks = 26) {
  const cells: { date: Date; visited: boolean }[] = [];
  const end = new Date();
  // Start on the Sunday that begins the window, so columns are clean weeks.
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);
  start.setDate(start.getDate() - start.getDay());

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    cells.push({ date: day, visited: dates.has(day.toDateString()) });
  }
  // Chunk into columns of 7 (Sun→Sat).
  const columns: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  return columns;
}

export default function Attendance() {
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    fetchAttendance()
      .then((d) => { setRows(d.rows); setSummary(d.summary); })
      .catch(() => setRows([]));
  }, []);

  const visitedDays = useMemo(
    () => new Set((rows || []).map((r) => new Date(r.date).toDateString())),
    [rows]
  );
  const columns = useMemo(() => buildHeatmap(visitedDays), [visitedDays]);

  if (rows === null) return <Loading label="Loading attendance" />;

  const monthLabels = columns.map((col, i) => {
    const first = col[0]?.date;
    if (!first) return null;
    const prev = columns[i - 1]?.[0]?.date;
    if (i === 0 || (prev && prev.getMonth() !== first.getMonth())) {
      return { index: i, label: first.toLocaleDateString('en-IN', { month: 'short' }) };
    }
    return null;
  }).filter(Boolean) as { index: number; label: string }[];

  return (
    <div>
      <SectionHeader
        title="Your"
        accent="Attendance"
        subtitle="Every check-in the front desk has recorded"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Stat icon={Flame} label="Current Streak" value={summary?.streak ?? 0} sub="consecutive days" tone={(summary?.streak ?? 0) >= 3 ? 'accent' : 'default'} />
        <Stat icon={CalendarCheck} label="This Month" value={summary?.thisMonth ?? 0} sub="visits" delay={0.05} />
        <Stat icon={TrendingUp} label="All Time" value={summary?.total ?? 0} sub="total visits" delay={0.1} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No visits recorded yet"
          message="Your attendance appears here once the front desk starts checking you in. If you've been training and this looks wrong, mention it at the desk."
        />
      ) : (
        <>
          {/* Heatmap */}
          <Card className="p-6 sm:p-8 mb-6 overflow-hidden">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-6">
              Last 6 Months
            </h3>
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="inline-block min-w-full">
                {/* Month labels */}
                <div className="flex gap-1 mb-2 ml-8">
                  {columns.map((_, i) => {
                    const m = monthLabels.find((x) => x.index === i);
                    return (
                      <div key={i} className="w-3 text-[9px] font-bold uppercase tracking-wider text-white/30">
                        {m ? m.label : ''}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  {/* Day-of-week labels */}
                  <div className="flex flex-col gap-1 w-6 flex-shrink-0">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                      <div key={i} className="h-3 text-[9px] font-bold text-white/25 leading-3">{d}</div>
                    ))}
                  </div>
                  {/* Grid */}
                  <div className="flex gap-1">
                    {columns.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-1">
                        {col.map((cell, ri) => (
                          <div
                            key={ri}
                            title={`${cell.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${cell.visited ? ' — trained' : ''}`}
                            className={`w-3 h-3 rounded-[3px] transition-colors ${
                              cell.visited
                                ? 'bg-[#FF003C] hover:bg-[#ff3363]'
                                : 'bg-white/[0.06] hover:bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6 text-[10px] font-bold uppercase tracking-widest text-white/25">
              <span>Rest</span>
              <span className="w-3 h-3 rounded-[3px] bg-white/[0.06]" />
              <span className="w-3 h-3 rounded-[3px] bg-[#FF003C]" />
              <span>Trained</span>
            </div>
          </Card>

          {/* Recent list */}
          <Card className="overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-white/10">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Recent Check-ins</h3>
            </div>
            <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto custom-scrollbar">
              {rows.slice(0, 60).map((r, i) => {
                const d = new Date(r.date);
                return (
                  <li key={r.id || i} className="px-6 sm:px-8 py-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#FF003C]/10 border border-[#FF003C]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-[#FF003C]">{d.getDate()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{fmtDate(r.date)}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-0.5">
                          {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/70">
                      Present
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
