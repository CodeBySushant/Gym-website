import React from 'react';
import { motion } from 'motion/react';
import { HealthTip } from '../types';
import { Lightbulb, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';
import OptimizedImage from './OptimizedImage';

interface HealthTipsProps {
  tips: HealthTip[] | null;
}

export default function HealthTips({ tips }: HealthTipsProps) {
  const isLoading = tips === null;
  const displayTips = tips || [];

  if (!isLoading && displayTips.length === 0) return null;

  return (
    <section id="tips" className="py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF003C]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 text-[#FF003C] mb-4">
              <Lightbulb className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Expert Insights</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9]">
              Fuel Your <br />
              <span className="text-[#FF003C]">Ambition</span>
            </h2>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white/40 max-w-md text-sm font-medium uppercase tracking-widest leading-relaxed"
          >
            Science-backed tips from our elite coaching team to optimize your performance, recovery, and lifestyle.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden">
                <Skeleton className="aspect-[16/10] rounded-none" />
                <div className="p-8 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ))
          ) : displayTips.map((tip, index) => (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden hover:border-[#FF003C]/50 transition-all duration-500"
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <OptimizedImage 
                  src={tip.imageUrl} 
                  alt={tip.title}
                  aspectRatio="aspect-auto"
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-4 left-6">
                  <span className="px-3 py-1 bg-[#FF003C] text-[10px] font-black uppercase tracking-widest rounded-full">
                    {tip.category}
                  </span>
                </div>
              </div>
              
              <div className="p-8">
                <h3 className="text-2xl font-black italic uppercase tracking-tight mb-4 group-hover:text-[#FF003C] transition-colors">
                  {tip.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6 line-clamp-3">
                  {tip.content}
                </p>
                <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                  Read Full Guide
                  <ChevronRight className="w-4 h-4 text-[#FF003C]" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
