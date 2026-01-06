/**
 * Skeleton loading placeholder for photo grids
 * Creates a shimmer animation effect while photos load
 */

interface PhotoSkeletonProps {
  count?: number;
}

export function PhotoSkeleton({ count = 12 }: PhotoSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 relative"
        >
          {/* Shimmer animation overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
        </div>
      ))}
    </>
  );
}

// For grid container with skeleton
export function PhotoGridSkeleton({ count = 12 }: PhotoSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <PhotoSkeleton count={count} />
    </div>
  );
}

