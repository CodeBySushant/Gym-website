import { useEffect, useState } from 'react';
import { Apple, Flame, UtensilsCrossed, StickyNote } from 'lucide-react';
import { DietPlan } from '../../types';
import { fetchDietPlan } from '../../memberApi';
import { Card, SectionHeader, Loading, EmptyState, Stat } from './ui';

export default function Diet() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDietPlan()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading your diet plan" />;

  if (!plan || !plan.meals?.length) {
    return (
      <div>
        <SectionHeader title="Your" accent="Diet Plan" />
        <EmptyState
          icon={Apple}
          title="No diet plan yet"
          message="Once your coach puts together a nutrition plan, every meal, portion and timing will appear here."
        />
      </div>
    );
  }

  const totalCalories = plan.meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);

  return (
    <div>
      <SectionHeader title="Your" accent="Diet Plan" subtitle={plan.title} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Stat icon={UtensilsCrossed} label="Meals / Day" value={plan.meals.length} sub="in your plan" />
        <Stat
          icon={Flame}
          label="Daily Target"
          value={plan.targetCalories ? `${plan.targetCalories}` : totalCalories ? `${totalCalories}` : '—'}
          sub="kcal"
          tone="accent"
          delay={0.05}
        />
        <Stat
          icon={Apple}
          label="Plan Updated"
          value={plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
          sub="by your coach"
          delay={0.1}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Meal timeline */}
      <div className="relative">
        {/* Vertical rail, hidden on mobile where the offset would look odd */}
        <div className="absolute left-[26px] top-4 bottom-4 w-px bg-white/10 hidden sm:block" aria-hidden="true" />

        <div className="space-y-4">
          {plan.meals.map((meal, i) => (
            <div key={i} className="relative sm:pl-16">
              {/* Timeline dot */}
              <div className="absolute left-0 top-6 w-[54px] hidden sm:flex justify-center" aria-hidden="true">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF003C] ring-4 ring-black" />
              </div>

              <Card hover className="p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF003C] mb-1.5">
                      {meal.time}
                    </div>
                    <h3 className="text-lg font-black italic uppercase tracking-tight">{meal.name}</h3>
                  </div>
                  {meal.calories ? (
                    <span className="self-start text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded-full text-white/50 tabular-nums">
                      {meal.calories} kcal
                    </span>
                  ) : null}
                </div>

                <ul className="space-y-2.5">
                  {(meal.items || []).map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-white/65">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF003C]/60 flex-shrink-0 mt-[7px]" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {plan.notes && (
        <Card className="p-6 sm:p-8 mt-6">
          <div className="flex items-start gap-4">
            <StickyNote className="w-5 h-5 text-[#FF003C] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">
                Coach&rsquo;s Notes
              </h4>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{plan.notes}</p>
            </div>
          </div>
        </Card>
      )}

      <p className="text-[10px] text-white/25 text-center mt-8 max-w-lg mx-auto leading-relaxed font-medium uppercase tracking-wider">
        This plan is guidance from your coach, not medical advice. Talk to a doctor before making
        major dietary changes, especially if you have a health condition.
      </p>
    </div>
  );
}
