import { useState, useRef } from 'react';
import { Service, Setting } from '../types';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Skeleton from './Skeleton';
import OptimizedImage from './OptimizedImage';

interface ServicesProps {
  services: Service[] | null;
  settings: Setting | null;
}

export default function Services({ services, settings }: ServicesProps) {
  const [activeTab, setActiveTab] = useState<'Equipment' | 'Facilities' | 'Services'>('Equipment');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const isLoading = services === null;
  const filteredServices = services ? services.filter(s => s.category === activeTab) : [];

  // Hide the whole section when loaded but empty (skeletons still show while loading)
  if (!isLoading && (services?.length ?? 0) === 0) return null;

  return (
    <section id="services" className="py-16 md:py-24 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4 text-center">
          {settings?.servicesTitle?.split(' ').map((word, i, arr) => (
            <span key={i}>
              {i === arr.length - 1 ? <span className="text-[#FF003C]">{word}</span> : word}{' '}
            </span>
          )) || (
            <>Elite <span className="text-[#FF003C]">Offerings</span></>
          )}
        </h2>
        {settings?.servicesSubtitle && (
          <p className="text-white/40 text-center max-w-2xl mx-auto mb-8 uppercase tracking-widest text-xs font-bold">
            {settings.servicesSubtitle}
          </p>
        )}
        
        <div className="flex justify-center gap-4 mb-12">
          {['Equipment', 'Facilities', 'Services'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                'px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 border-2',
                activeTab === tab 
                  ? 'bg-[#FF003C] border-[#FF003C] text-white' 
                  : 'border-white/10 text-white/40 hover:border-white/20'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="relative group/slider">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto pb-12 px-6 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[280px] md:w-[350px] aspect-[4/5] rounded-3xl overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
            ))
          ) : filteredServices.map((service, i) => (
            <div
              key={`${activeTab}-${i}`}
              className="flex-shrink-0 w-[280px] md:w-[350px] aspect-[4/5] relative rounded-3xl overflow-hidden snap-center group"
            >
              <OptimizedImage
                src={service.imageUrl}
                alt={service.title}
                aspectRatio="aspect-auto"
                className="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-8 left-8 right-8">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-2 drop-shadow-lg">
                  {service.title}
                </h3>
                <div className="w-12 h-1 bg-[#FF003C] group-hover:w-full transition-all duration-500" />
              </div>
            </div>
          ))}
        </div>

        {!isLoading && filteredServices.length > 0 && (
          <>
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#FF003C] hover:border-[#FF003C] z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-[#FF003C] hover:border-[#FF003C] z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        {/* Gradient Fades */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
}