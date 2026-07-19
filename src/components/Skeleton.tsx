import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-white/5 rounded-2xl", 
        className
      )} 
    />
  );
}
