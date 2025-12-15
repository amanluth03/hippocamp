import { Photo } from "../services/api";

interface PhotoModalProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function PhotoModal({ photo, photos, onClose, onNext, onPrevious }: PhotoModalProps) {
  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && hasPrevious) onPrevious();
    if (e.key === "ArrowRight" && hasNext) onNext();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl font-light transition-colors z-50"
        aria-label="Close"
      >
        ×
      </button>

      {/* Previous button */}
      {hasPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 text-white/80 hover:text-white text-5xl font-light transition-colors z-50"
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 text-white/80 hover:text-white text-5xl font-light transition-colors z-50"
          aria-label="Next photo"
        >
          ›
        </button>
      )}

      {/* Photo container */}
      <div
        className="relative max-w-7xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <img
          src={photo.url}
          alt="Full size photo"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        {/* Photo metadata */}
        <div className="mt-4 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {photo.uploader_name?.[0]?.toUpperCase() || photo.uploader_email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium">{photo.uploader_name || photo.uploader_email || "Unknown"}</p>
                <p className="text-sm text-gray-400">
                  {new Date(photo.uploaded_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              {currentIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

