import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getFlashbacks, FlashbacksResponse, FlashbackPhoto } from "../services/api";
import { Spinner } from "../components/Spinner";
import { LazyImage } from "../components/LazyImage";

interface FlashbacksProps {
  token: string | null;
}

export function Flashbacks({ token }: FlashbacksProps) {
  const [data, setData] = useState<FlashbacksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<FlashbackPhoto | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadFlashbacks() {
      try {
        const response = await getFlashbacks(token!);
        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load flashbacks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFlashbacks();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Please sign in to view flashbacks</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/events"
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400"
          >
            🦛 Hippo Campus
          </Link>
          <Link
            to="/events"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Events
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">✨ Flashbacks</h1>
          {data && (
            <p className="text-xl text-purple-300">On This Day - {data.date}</p>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Spinner size="lg" />
            <p className="text-gray-400">Loading your memories...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        ) : !data?.has_flashbacks ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No memories for today
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              When you have photos from previous years on this date, they'll appear here as flashbacks!
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {data.groups.map((group) => (
              <div key={group.years_ago}>
                {/* Year Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                  <h2 className="text-xl font-semibold text-purple-300 whitespace-nowrap">
                    {group.label}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.photos.map((photo) => (
                    <LazyImage
                      key={photo.id}
                      src={photo.url}
                      alt="Memory"
                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all hover:scale-[1.02] cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium truncate">
                            {photo.event_name}
                          </p>
                          <p className="text-gray-300 text-xs">
                            by {photo.uploader_name}
                          </p>
                        </div>
                      </div>
                    </LazyImage>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl font-light z-50"
          >
            ×
          </button>

          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.url}
              alt="Memory"
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />

            {/* Info */}
            <div className="mt-4 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 w-full max-w-md">
              <div className="text-center text-white">
                <p className="font-semibold text-lg">{selectedPhoto.event_name}</p>
                <p className="text-purple-300">
                  {selectedPhoto.years_ago === 1
                    ? "1 year ago"
                    : `${selectedPhoto.years_ago} years ago`}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Uploaded by {selectedPhoto.uploader_name}
                </p>
                <Link
                  to={`/events/${selectedPhoto.event_id}`}
                  className="inline-block mt-3 text-purple-400 hover:text-purple-300 text-sm"
                >
                  View Event →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

