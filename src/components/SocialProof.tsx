import { useRef } from 'react';
import { motion } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Testimonial } from '../types';
import { BRAND, GOOGLE_RATING } from '../config';
import Skeleton from './Skeleton';

interface SocialProofProps {
  testimonials: Testimonial[] | null;
}

export default function SocialProof({ testimonials }: SocialProofProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const isLoading = testimonials === null;
  const displayTestimonials = testimonials || [];

  // Hide the whole section when loaded but empty (skeletons still show while loading)
  if (!isLoading && displayTestimonials.length === 0) return null;

  return (
    <section className="py-24 bg-[#050505] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-col md:flex-row items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
            Proof in <span className="text-[#FF003C]">Results</span>
          </h2>
          <p className="text-white/60 max-w-md font-medium">
            Join the members who have transformed their lives at {BRAND.full}.
          </p>
        </div>
        {GOOGLE_RATING && (
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="text-4xl font-black text-[#FF003C]">{GOOGLE_RATING.split('/')[0]}</div>
            <div>
              <div className="flex text-yellow-400 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/40">
                Google Rating
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative group/slider">
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto pb-12 px-6 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[320px] md:w-[400px] bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                <Skeleton className="h-24 w-full" />
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))
          ) : displayTestimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              viewport={{ once: true, margin: "0px 100px 0px 100px" }}
              className="flex-shrink-0 w-[320px] md:w-[400px] bg-white/5 p-8 rounded-3xl border border-white/10 snap-center relative group hover:border-[#FF003C]/50 transition-colors"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-white/10 group-hover:text-[#FF003C]/20 transition-colors" />
              <p className="text-lg font-medium mb-8 italic leading-relaxed text-white/80">
                "{testimonial.content}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FF003C] flex items-center justify-center font-black text-xl italic overflow-hidden">
                  {testimonial.imageUrl ? (
                    <img src={testimonial.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    testimonial.name[0]
                  )}
                </div>
                <div>
                  <div className="font-bold uppercase tracking-widest text-sm">{testimonial.name}</div>
                  <div className="text-xs text-white/40 font-medium uppercase tracking-widest">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {!isLoading && displayTestimonials.length > 0 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#FF003C] hover:border-[#FF003C] z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#FF003C] hover:border-[#FF003C] z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#050505] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
}