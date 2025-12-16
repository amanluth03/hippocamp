import { useState, useEffect, useCallback } from "react";
import { Photo } from "../services/api";

interface PhotoModalProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onNavigate?: (photo: Photo) => void;
  onDelete?: (photoId: string) => Promise<void>;
}

export function PhotoModal({ photo, photos, onClose, onNavigate, onDelete }: PhotoModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrevious = useCallback(() => {
    if (hasPrevious && onNavigate) {
      onNavigate(photos[currentIndex - 1]);
    }
  }, [hasPrevious, onNavigate, photos, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(photos[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, photos, currentIndex]);

  // Reset delete confirmation when photo changes
  useEffect(() => {
    setConfirmDelete(false);
    setDeleting(false);
  }, [photo.id]);

  async function handleDelete() {
    if (!onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete(photo.id);
      // The parent will handle closing/navigating
    } catch (err) {
      console.error("Failed to delete photo:", err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "ArrowRight") handleNext();
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrevious, handleNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
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
            handlePrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white text-3xl rounded-full transition-colors z-50"
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
            handleNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white text-3xl rounded-full transition-colors z-50"
          aria-label="Next photo"
        >
          ›
        </button>
      )}

      {/* Photo container */}
      <div
        className="relative max-w-7xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <img
          src={photo.url}
          alt="Full size photo"
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />

        {/* Photo metadata */}
        <div className="mt-4 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 w-full min-w-[320px] max-w-2xl">
          <div className="flex items-center justify-between text-white gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                {photo.uploader_name?.[0]?.toUpperCase() || photo.uploader_email?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{photo.uploader_name || photo.uploader_email || "Unknown"}</p>
                <p className="text-sm text-gray-400">
                  {new Date(photo.uploaded_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400 hidden sm:inline">Delete?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting ? "..." : "Yes"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Delete photo"
                    title="Delete photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )
              )}
              <p className="text-sm text-gray-400 whitespace-nowrap">
                {currentIndex + 1} / {photos.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

