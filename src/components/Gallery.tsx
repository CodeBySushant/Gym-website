import { useRef } from 'react';
import { motion } from 'motion/react';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryItem } from '../types';
import { BRAND } from '../config';
import Skeleton from './Skeleton';
import OptimizedImage from './OptimizedImage';

interface GalleryProps {
  items: GalleryItem[] | null;
}

/**
 * Turns a YouTube or Vimeo link into its embeddable player URL.
 *
 * The admin panel labels this field "Video URL (YouTube/Vimeo)", but a share
 * link cannot be played by a <video> tag — it needs an iframe pointed at the
 * player URL. Returns null for anything else, which is then treated as a
 * direct video file.
 */
function toEmbedUrl(raw: string): string | null {
  const url = (raw || '').trim();
  if (!url) return null;

  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

export default function Gallery({ items }: GalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const isLoading = items === null;
  const displayItems = items || [];

  // Hide the whole section when loaded but empty (skeletons still show while loading)
  if (!isLoading && displayItems.length === 0) return null;

  return (
    <section id="gallery" className="py-24 bg-[#050505] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
          Inside <span className="text-[#FF003C]">{BRAND.first}</span>
        </h2>
        <p className="text-white/60 max-w-md font-medium">
          Visual proof of the energy and community that makes us the best in {BRAND.city}.
        </p>
      </div>

      <div className="relative group/slider">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto pb-12 px-6 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[300px] md:w-[600px] aspect-video rounded-3xl overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
            ))
          ) : displayItems.map((item, i) => {
            // Computed once per item so the regex does not run twice per render.
            const embedUrl = item.type === 'video' ? toEmbedUrl(item.url) : null;

            return (
              <motion.div
                key={item.id || i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true, margin: "0px 100px 0px 100px" }}
                className="flex-shrink-0 w-[300px] md:w-[600px] aspect-video relative rounded-3xl overflow-hidden snap-center group"
              >
                {item.type === 'image' ? (
                  <OptimizedImage
                    src={item.url}
                    alt={item.caption || `Inside ${BRAND.full}`}
                    aspectRatio="aspect-auto"
                    className="w-full h-full"
                  />
                ) : embedUrl ? (
                  // Hosted video (YouTube / Vimeo) — the player owns the frame,
                  // so nothing is layered over it that could swallow a click.
                  <iframe
                    className="w-full h-full"
                    src={embedUrl}
                    title={item.caption || `Video from ${BRAND.full}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  // Direct video file (.mp4 / .webm) uploaded or linked by the gym.
                  <div className="w-full h-full relative">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      src={item.url}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-[#FF003C] p-4 rounded-full shadow-[0_0_20px_rgba(255,0,60,0.6)]">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hover scrim. pointer-events-none matters: without it this div
                    covers the whole card and blocks the video player beneath. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {item.caption && (
                  <div className="absolute bottom-6 left-8 right-8 pointer-events-none">
                    <span className="text-sm font-black uppercase tracking-[0.3em] text-[#FF003C] mb-1 block drop-shadow-lg">
                      {item.type === 'video' ? 'Energy in Motion' : `Inside ${BRAND.first}`}
                    </span>
                    <h3 className="text-xl font-bold uppercase tracking-widest leading-none drop-shadow-lg">
                      {item.caption}
                    </h3>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {!isLoading && displayItems.length > 0 && (
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
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#050505] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
}
