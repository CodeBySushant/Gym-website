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
    <section id="trainers" className="py-24 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
          Meet Your <span className="text-[#FF003C]">Coaches</span>
        </h2>
        <p className="text-white/60 max-w-md mx-auto font-medium">
          Elite trainers dedicated to pushing you beyond your limits.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-3xl overflow-hidden bg-white/5 border border-white/10">
              <Skeleton className="aspect-[3/4] rounded-none" />
              <div className="p-8 space-y-4">
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
            className="group relative rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-[#FF003C]/50 transition-all duration-500"
          >
            <OptimizedImage
              src={trainer.imageUrl}
              alt={trainer.name}
              aspectRatio="aspect-[3/4]"
              className="w-full"
            />
            
            <div className="p-8">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-[#FF003C] mb-2 block">
                {trainer.specialization}
              </span>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">
                {trainer.name}
              </h3>
              <p className="text-white/60 text-sm font-medium mb-6 leading-relaxed">
                {trainer.bio}
              </p>
              <div className="pt-6 border-t border-white/10 italic text-white/80 text-sm">
                "{trainer.quote}"
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}