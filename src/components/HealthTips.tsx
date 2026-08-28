import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HealthTip } from '../types';
import { Lightbulb, ChevronRight, X } from 'lucide-react';
import Skeleton from './Skeleton';
import OptimizedImage from './OptimizedImage';

interface HealthTipsProps {
  tips: HealthTip[] | null;
}

export default function HealthTips({ tips }: HealthTipsProps) {
  // "Read Full Guide" used to be a button with no handler. Tips are stored as a
  // single body of text with no detail route, so the whole tip opens here
  // instead — no routing, no truncation.
  const [active, setActive] = useState<HealthTip | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active]);

  const isLoading = tips === null;
  const displayTips = tips || [];

  if (!isLoading && displayTips.length === 0) return null;

  return (
    <section id="tips" className="py-16 md:py-24 bg-[#050505] relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF003C]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 text-[#FF003C] mb-4">
              <Lightbulb className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Expert Insights</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
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
            <motion.article
              key={tip.id || index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden hover:border-[#FF003C]/50 transition-all duration-500 flex flex-col"
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <OptimizedImage
                  src={tip.imageUrl}
                  alt={tip.title}
                  aspectRatio="aspect-auto"
                  className="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute bottom-4 left-6">
                  <span className="px-3 py-1 bg-[#FF003C] text-[10px] font-black uppercase tracking-widest rounded-full">
                    {tip.category}
                  </span>
                </div>
              </div>

              <div className="p-6 md:p-8 flex flex-col flex-grow">
                <h3 className="text-2xl font-black italic uppercase tracking-tight mb-4 group-hover:text-[#FF003C] transition-colors">
                  {tip.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6 line-clamp-3">
                  {tip.content}
                </p>
                <button
                  onClick={() => setActive(tip)}
                  aria-label={`Read the full guide: ${tip.title}`}
                  className="mt-auto self-start flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF003C]"
                >
                  Read Full Guide
                  <ChevronRight className="w-4 h-4 text-[#FF003C]" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Full guide */}
      <AnimatePresence>
        {active && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setActive(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative bg-[#0A0A0A] border border-white/10 rounded-[2rem] w-full max-w-2xl max-h-[88vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="absolute top-5 right-5 z-10 bg-black/70 border border-white/10 p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-[#FF003C] hover:border-[#FF003C] transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {active.imageUrl && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={active.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-8 sm:p-10">
                <span className="inline-block px-3 py-1 bg-[#FF003C] text-[10px] font-black uppercase tracking-widest rounded-full mb-5">
                  {active.category}
                </span>
                <h3 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter leading-[0.95] mb-6">
                  {active.title}
                </h3>
                <p className="text-white/65 leading-relaxed whitespace-pre-line">
                  {active.content}
                </p>
                <p className="text-[10px] text-white/25 mt-10 leading-relaxed uppercase tracking-wider font-medium">
                  General guidance from our coaching team, not medical advice. Talk to a doctor before
                  making major changes to your training or diet.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
