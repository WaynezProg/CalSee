'use client';

interface LoadingSkeletonProps {
  rows?: number;
}

export default function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="w-full bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
          </div>
          <div className="w-10 h-6 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
