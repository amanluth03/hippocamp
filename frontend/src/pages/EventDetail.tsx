import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Event, getEvent, Photo, getEventPhotos, uploadPhoto } from "../services/api";
import { PhotoModal } from "../components/PhotoModal";

interface EventDetailProps {
  token: string | null;
}

export function EventDetail({ token }: EventDetailProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token || !eventId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    
    // Clear stale state before new fetch
    setError(null);
    setEvent(null);
    setLoading(true);

    async function loadEvent() {
      try {
        const data = await getEvent(token!, eventId!);
        if (!cancelled) {
          setEvent(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load event");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [token, eventId]);

  // Load photos separately
  useEffect(() => {
    if (!token || !eventId || !event) {
      return;
    }

    let cancelled = false;
    setPhotosLoading(true);

    async function loadPhotos() {
      try {
        const data = await getEventPhotos(token!, eventId!);
        if (!cancelled) {
          setPhotos(data);
        }
      } catch (err) {
        console.error("Failed to load photos:", err);
      } finally {
        if (!cancelled) {
          setPhotosLoading(false);
        }
      }
    }

    loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [token, eventId, event]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !token || !eventId) return;

    setUploading(true);
    setError(null);

    try {
      // Upload all selected files
      const uploadPromises = Array.from(files).map((file) =>
        uploadPhoto(token, eventId, file)
      );
      const newPhotos = await Promise.all(uploadPromises);
      
      // Add to photos list
      setPhotos((prev) => [...newPhotos, ...prev]);
      
      // Update event photo count
      if (event) {
        setEvent({
          ...event,
          photo_count: event.photo_count + newPhotos.length,
        });
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Failed to upload photos. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function copyInviteCode() {
    if (event) {
      navigator.clipboard.writeText(event.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePhotoClick(photo: Photo) {
    setSelectedPhoto(photo);
  }

  function handleNextPhoto() {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    if (currentIndex < photos.length - 1) {
      setSelectedPhoto(photos[currentIndex + 1]);
    }
  }

  function handlePreviousPhoto() {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
    if (currentIndex > 0) {
      setSelectedPhoto(photos[currentIndex - 1]);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Please sign in to view this event</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-gray-400 text-xl">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || "Event not found"}</p>
          <Link to="/events" className="text-purple-400 hover:underline">
            ← Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/events" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
        </div>

        {/* Event Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-6">
          <h1 className="text-4xl font-bold text-white mb-4">{event.name}</h1>
          
          {event.description && (
            <p className="text-gray-300 mb-4">{event.description}</p>
          )}

          <div className="flex flex-wrap gap-6 text-gray-400 mb-6">
            {event.location && (
              <span className="flex items-center gap-2">
                📍 {event.location}
              </span>
            )}
            {event.event_date && (
              <span className="flex items-center gap-2">
                📅 {new Date(event.event_date).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-2">
              👥 {event.member_count} members
            </span>
            <span className="flex items-center gap-2">
              📸 {event.photo_count} photos
            </span>
          </div>

          {/* Invite Code */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Share this code to invite others:</p>
            <div className="flex items-center gap-3">
              <code className="text-2xl font-mono text-purple-300 tracking-wider">
                {event.invite_code}
              </code>
              <button
                onClick={copyInviteCode}
                className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Photos Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Photos</h2>
            <div className="flex gap-2 items-center">
              {uploading && (
                <span className="text-gray-400 text-sm">Uploading...</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={uploading}
              />
              <label
                htmlFor="photo-upload"
                className={`px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-colors cursor-pointer ${
                  uploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                + Upload Photos
              </label>
            </div>
          </div>
          
          {photosLoading ? (
            <div className="text-center py-12 text-gray-400">
              <p>Loading photos...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">📷</p>
              <p>No photos yet. Be the first to upload!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  className="group relative aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt="Event photo"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay with uploader info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {photo.uploader_name?.[0]?.toUpperCase() || photo.uploader_email?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {photo.uploader_name || photo.uploader_email || "Unknown"}
                          </p>
                          <p className="text-gray-300 text-xs">
                            {new Date(photo.uploaded_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNext={handleNextPhoto}
          onPrevious={handlePreviousPhoto}
        />
      )}
    </div>
  );
}

