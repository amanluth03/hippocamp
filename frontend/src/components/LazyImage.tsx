import { useState, useRef, useEffect, ReactNode } from "react";

interface LazyImageProps {
  src: string;
  fallbackSrc?: string;  // Fallback URL if primary src fails (e.g., original image if thumbnail fails)
  alt?: string;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
  children?: ReactNode;
}

/**
 * LazyImage - Only loads image when it enters the viewport
 * Prevents overwhelming CDN with too many concurrent requests
 * Supports fallback URL for graceful degradation (thumbnail -> original)
 */
export function LazyImage({ 
  src, 
  fallbackSrc,
  alt = "", 
  className = "", 
  imgClassName = "",
  onClick,
  children 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [triedFallback, setTriedFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
    setHasError(false);
    setTriedFallback(false);
  }, [src]);

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

  const handleError = () => {
    // If we have a fallback and haven't tried it yet, use it
    if (fallbackSrc && !triedFallback && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setTriedFallback(true);
      setIsLoaded(false);
    } else {
      // No fallback or fallback also failed
      setHasError(true);
    }
  };

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
            src={currentSrc}
            alt={alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            } ${imgClassName}`}
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
          />
        </>
      )}
      
      {/* Overlay content (badges, info, etc.) */}
      {children}
    </div>
  );
}
