import { Star, ArrowRight } from 'lucide-react';
import { Setting } from '../types';
import { BRAND, DEFAULTS, GOOGLE_RATING } from '../config';
import Skeleton from './Skeleton';

interface HeroProps {
  settings: Setting | null;
}

export default function Hero({ settings }: HeroProps) {
  const isLoading = settings === null;
  const headline = settings?.heroHeadline || DEFAULTS.heroHeadline;
  const subline = settings?.heroSubline || DEFAULTS.heroSubline;
  const videoUrl = settings?.heroVideoUrl || DEFAULTS.heroVideoUrl;

  return (
    <section id="home" className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background: video if the admin has set one, otherwise a branded gradient */}
      <div className="absolute inset-0 z-0">
        {videoUrl ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover opacity-50 transition-opacity duration-1000"
            src={videoUrl}
          />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(255,0,60,0.25),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,0,60,0.1),black_70%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {GOOGLE_RATING && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              {GOOGLE_RATING} Google Rating
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-6 mb-8">
            <Skeleton className="h-20 w-full max-w-4xl" />
            <Skeleton className="h-20 w-full max-w-2xl" />
          </div>
        ) : (
          <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter uppercase leading-[0.85] mb-8">
            {headline.split(' ').map((word, i) => (
              <span key={i} className={i % 2 !== 0 ? 'text-[#FF003C]' : 'text-white'}>
                {word}{' '}
              </span>
            ))}
          </h1>
        )}

        {isLoading ? (
          <Skeleton className="h-6 w-full max-w-md mx-auto mb-10" />
        ) : (
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/70 mb-10 font-medium">
            {subline}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#trial"
            className="group bg-[#FF003C] text-white px-10 py-5 rounded-full text-lg font-black uppercase tracking-widest hover:bg-white hover:text-[#FF003C] transition-all duration-300 flex items-center gap-3 shadow-[0_0_30px_rgba(255,0,60,0.4)]"
          >
            Book Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#pricing"
            className="px-10 py-5 rounded-full text-lg font-black uppercase tracking-widest border-2 border-white/20 hover:border-white transition-all duration-300"
          >
            View Membership Plans
          </a>
        </div>
      </div>

      {/* Kinetic Text Background (Subtle) */}
      <div className="absolute bottom-10 left-0 right-0 overflow-hidden whitespace-nowrap opacity-5 pointer-events-none select-none">
        <div className="text-[15vw] font-black italic uppercase text-white animate-marquee">
          {`${BRAND.full} • ${DEFAULTS.heroHeadline} • ELITE FITNESS • ${BRAND.city} • `.repeat(2)}
        </div>
      </div>
    </section>
  );
}
