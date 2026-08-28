import { Star, ArrowRight, MapPin } from 'lucide-react';
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

  // An admin upload replaces both crops with a single image. Otherwise the two
  // purpose-made files are used: wide for desktop, portrait for phones.
  const override = settings?.heroImageUrl || '';
  const desktopImage = override || DEFAULTS.heroImage;
  const mobileImage = override || DEFAULTS.heroImageMobile || desktopImage;

  return (
    <section
      id="home"
      className="relative min-h-[100svh] md:h-screen md:min-h-[720px] flex items-center overflow-hidden"
    >
      {/*
        LAYER 0 — background.
        Precedence: admin video > admin upload > bundled photo > gradient.
      */}
      <div className="absolute inset-0 z-0">
        {videoUrl ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover opacity-60"
            src={videoUrl}
          />
        ) : desktopImage ? (
          <picture>
            {/* Portrait crop for phones — the athlete stays centred instead of
                being sliced out of the wide image by object-fit. */}
            <source media="(max-width: 767px)" srcSet={mobileImage} />
            <img
              src={desktopImage}
              alt=""
              aria-hidden="true"
              /* This is the LCP element: load it eagerly, never lazily. */
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center md:object-right"
            />
          </picture>
        ) : (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(255,0,60,0.25),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,0,60,0.1),black_70%)]" />
        )}

        {/* Readability scrims.
            Mobile: vertical fade, since copy sits over the subject.
            Desktop: left-to-right fade, keeping the athlete clear on the right. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black md:bg-gradient-to-r md:from-black md:via-black/60 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        {/* Faint brand wash so the photo reads as part of the site. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,0,60,0.16),transparent_55%)]" />
      </div>

      {/*
        LAYER 1 — kinetic marquee. Above the photo, beneath the copy.
        Opacity raised from 5% because that was tuned for a flat gradient and
        is invisible against a photograph.
      */}
      <div
        className="absolute bottom-6 md:bottom-10 left-0 right-0 z-[1] overflow-hidden whitespace-nowrap opacity-[0.09] pointer-events-none select-none"
        aria-hidden="true"
      >
        <div className="text-[16vw] leading-none font-black italic uppercase text-white animate-marquee">
          {`${BRAND.full} • ${DEFAULTS.heroHeadline} • ELITE FITNESS • ${BRAND.city} • `.repeat(2)}
        </div>
      </div>

      {/* LAYER 2 — content. Left-pinned on desktop so it never hits the athlete. */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-28 md:py-0">
        <div className="max-w-2xl text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 mb-6">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
              <MapPin className="w-3.5 h-3.5 text-[#FF003C]" />
              {BRAND.city}
            </span>
            {GOOGLE_RATING && (
              <span className="inline-flex items-center gap-2">
                <span className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
                  {GOOGLE_RATING} Google Rating
                </span>
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center md:items-start gap-4 mb-8">
              <Skeleton className="h-16 md:h-24 w-full max-w-xl" />
              <Skeleton className="h-16 md:h-24 w-4/5 max-w-md" />
            </div>
          ) : (
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter uppercase leading-[0.85] mb-6 drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
              {headline.split(' ').map((word, i) => (
                <span key={i} className={i % 2 !== 0 ? 'text-[#FF003C]' : 'text-white'}>
                  {word}{' '}
                </span>
              ))}
            </h1>
          )}

          {/* Accent rule, desktop only — anchors the left-aligned block. */}
          <div className="hidden md:block w-20 h-1 bg-[#FF003C] mb-7" aria-hidden="true" />

          {isLoading ? (
            <Skeleton className="h-6 w-full max-w-md mb-10 mx-auto md:mx-0" />
          ) : (
            <p className="text-base sm:text-lg md:text-xl text-white/75 mb-9 font-medium max-w-xl mx-auto md:mx-0 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
              {subline}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-4">
            <a
              href="#trial"
              className="group bg-[#FF003C] text-white px-8 md:px-10 py-4 md:py-5 rounded-full text-base md:text-lg font-black uppercase tracking-widest hover:bg-white hover:text-[#FF003C] transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,0,60,0.4)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Book Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#pricing"
              className="px-8 md:px-10 py-4 md:py-5 rounded-full text-base md:text-lg font-black uppercase tracking-widest border-2 border-white/25 bg-black/40 backdrop-blur-sm hover:border-white hover:bg-white/10 transition-all duration-300 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              View Plans
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
