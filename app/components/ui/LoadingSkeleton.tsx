'use client';

import { memo } from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  variant?: 'card' | 'list' | 'chart' | 'text';
}

const SkeletonPulse = memo(function SkeletonPulse({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return <div className={`animate-pulse bg-gray-200 ${className}`} style={style} />;
});

const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
      <SkeletonPulse className="w-16 h-16 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="h-4 rounded w-2/3" />
        <SkeletonPulse className="h-3 rounded w-1/3" />
        <SkeletonPulse className="h-3 rounded w-1/2" />
      </div>
      <SkeletonPulse className="w-10 h-6 rounded" />
    </div>
  );
});

const ListSkeleton = memo(function ListSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <SkeletonPulse className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <SkeletonPulse className="h-3 rounded w-3/4" />
        <SkeletonPulse className="h-2.5 rounded w-1/2" />
      </div>
    </div>
  );
});

const ChartSkeleton = memo(function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonPulse className="h-4 rounded w-1/4" />
      <div className="flex items-end gap-2 h-32">
        {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
          <SkeletonPulse
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <SkeletonPulse key={day} className="h-3 w-6 rounded" />
        ))}
      </div>
    </div>
  );
});

const TextSkeleton = memo(function TextSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonPulse className="h-4 rounded w-full" />
      <SkeletonPulse className="h-4 rounded w-5/6" />
      <SkeletonPulse className="h-4 rounded w-4/6" />
    </div>
  );
});

function LoadingSkeleton({ rows = 3, variant = 'card' }: LoadingSkeletonProps) {
  const SkeletonComponent = {
    card: CardSkeleton,
    list: ListSkeleton,
    chart: ChartSkeleton,
    text: TextSkeleton,
  }[variant];

  return (
    <div
      className="space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
      {variant === 'chart' ? (
        <SkeletonComponent />
      ) : (
        Array.from({ length: rows }).map((_, index) => (
          <SkeletonComponent key={index} />
        ))
      )}
    </div>
  );
}

export default memo(LoadingSkeleton);

// Named exports for direct use
export { CardSkeleton, ListSkeleton, ChartSkeleton, TextSkeleton, SkeletonPulse };
