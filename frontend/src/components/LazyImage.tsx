import { useState, useRef, useEffect, ReactNode } from "react";

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  children?: ReactNode;
}

/**
 * LazyImage - Only loads image when it enters the viewport
 * Prevents overwhelming CDN with too many concurrent requests
 */
export function LazyImage({ 
  src, 
  alt = "", 
  className = "", 
  imgClassName = "",
  onClick,
  children 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className} onClick={onClick}>
      {/* Background placeholder */}
      <div className="absolute inset-0 bg-white/5" />
      
      {isInView && (
        <>
          {/* Shimmer while loading */}
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
            </div>
          )}
          
          {/* Error state */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-xs">⚠️</span>
            </div>
          )}
          
          {/* Actual image */}
          <img
            src={src}
            alt={alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            } ${imgClassName}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        </>
      )}
      
      {/* Overlay content (badges, info, etc.) */}
      {children}
    </div>
  );
}
