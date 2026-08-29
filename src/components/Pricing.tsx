import { motion } from 'motion/react';
import { Check, Star } from 'lucide-react';
import { PricingPlan } from '../types';
import { cn } from '../lib/utils';
import Skeleton from './Skeleton';

interface PricingProps {
  plans: PricingPlan[] | null;
}

export default function Pricing({ plans }: PricingProps) {
  const isLoading = plans === null;
  const displayPlans = plans || [];

  // Hide the whole section when loaded but empty (skeletons still show while loading)
  if (!isLoading && displayPlans.length === 0) return null;

  return (
    <section id="pricing" className="py-16 md:py-24 bg-[#050505] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
          Membership <span className="text-[#FF003C]">Tiers</span>
        </h2>
        <p className="text-white/60 max-w-md mx-auto font-medium">
          Transparent pricing for elite fitness. No hidden fees.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="p-6 md:p-10 rounded-3xl bg-white/5 border border-white/10 space-y-5 md:space-y-6">
              <Skeleton className="h-8 w-32" />
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          ))
        ) : displayPlans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className={cn(
              "relative p-6 md:p-10 rounded-3xl overflow-hidden border transition-all duration-500",
              plan.isPopular 
                ? "bg-white/10 border-[#FF003C] shadow-[0_0_40px_rgba(255,0,60,0.2)] md:scale-105 z-10" 
                : "bg-white/5 border-white/10 hover:border-white/20"
            )}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 bg-[#FF003C] text-white px-4 md:px-6 py-1.5 md:py-2 rounded-bl-2xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3 fill-current" />
                Most Popular
              </div>
            )}
            
            <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-2">
              {plan.name}
            </h3>
            <div className="flex items-baseline gap-2 mb-6 md:mb-8">
              <span className="text-4xl md:text-5xl font-black italic text-[#FF003C]">₹{plan.price}</span>
              <span className="text-white/40 font-bold uppercase tracking-widest text-xs">
                /{plan.period}
              </span>
            </div>
            
            <div className="space-y-3 md:space-y-4 mb-6 md:mb-10">
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="bg-[#FF003C]/20 p-1 rounded-full">
                    <Check className="w-4 h-4 text-[#FF003C]" />
                  </div>
                  <span className="text-sm font-medium text-white/70">{feature}</span>
                </div>
              ))}
            </div>
            
            <a
              href="#trial"
              className={cn(
                "w-full py-3.5 md:py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-2",
                plan.isPopular 
                  ? "bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C]" 
                  : "bg-white/10 text-white hover:bg-white hover:text-black"
              )}
            >
              Get Started
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}