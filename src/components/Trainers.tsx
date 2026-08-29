import { motion } from 'motion/react';
import { Trainer } from '../types';
import Skeleton from './Skeleton';
import OptimizedImage from './OptimizedImage';

interface TrainersProps {
  trainers: Trainer[] | null;
}

export default function Trainers({ trainers }: TrainersProps) {
  const isLoading = trainers === null;
  const displayTrainers = trainers ? trainers.slice(0, 3) : [];

  // Hide the whole section when loaded but empty (skeletons still show while loading)
  if (!isLoading && displayTrainers.length === 0) return null;

  return (
    <section id="trainers" className="py-16 md:py-24 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
          Meet Your <span className="text-[#FF003C]">Coaches</span>
        </h2>
        <p className="text-white/60 max-w-md mx-auto font-medium">
          Elite trainers dedicated to pushing you beyond your limits.
        </p>
        <p className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-white/25 mt-4">
          Swipe to see more &rarr;
        </p>
      </div>

      <div className="flex md:grid md:grid-cols-3 md:max-w-7xl md:mx-auto px-6 pb-4 md:pb-0 gap-5 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory no-scrollbar scroll-smooth">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[78vw] max-w-[320px] md:w-auto md:max-w-none rounded-3xl overflow-hidden bg-white/5 border border-white/10">
              <Skeleton className="aspect-[3/4] rounded-none" />
              <div className="p-6 md:p-8 space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))
        ) : displayTrainers.map((trainer, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className="flex-shrink-0 w-[78vw] max-w-[320px] md:w-auto md:max-w-none snap-center group relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#FF003C]/50 transition-all duration-500"
          >
            {/*
              The name and role sit ON the photo rather than under it. That
              removes ~60px of stacked text from every card, and the gradient
              gives the portrait a purpose beyond being a portrait.
            */}
            <div className="relative">
              <OptimizedImage
                src={trainer.imageUrl}
                alt={trainer.name}
                aspectRatio="aspect-square md:aspect-[3/4]"
                className="w-full"
                objectPosition="object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 pointer-events-none">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-[#FF003C] mb-1.5 block">
                  {trainer.specialization}
                </span>
                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  {trainer.name}
                </h3>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {/* Clamped so one trainer writing an essay cannot make its card
                  taller than the rest of the row. */}
              <p className="text-white/55 text-sm font-medium leading-relaxed line-clamp-3">
                {trainer.bio}
              </p>
              {trainer.quote && (
                <div className="mt-4 pt-4 border-t border-white/10 italic text-white/75 text-sm leading-snug line-clamp-2">
                  "{trainer.quote}"
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}