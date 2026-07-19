import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import Skeleton from './Skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className, 
  aspectRatio = "aspect-square",
  width,
  height
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-white/5", aspectRatio, className)}>
      {!isLoaded && !error && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/20 text-[10px] font-bold uppercase tracking-widest">
          Failed to load
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          referrerPolicy="no-referrer"
          className={cn(
            "w-full h-auto object-cover transition-all duration-700",
            isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-105 blur-lg"
          )}
        />
      )}
    </div>
  );
}
