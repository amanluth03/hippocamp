import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Event, getEvent, Photo, getEventPhotos, uploadPhoto, deletePhoto, EventMember, getEventMembers, updateEvent, EventUpdate, deleteEvent } from "../services/api";
import { PhotoModal } from "../components/PhotoModal";
import { Spinner, LoadingScreen } from "../components/Spinner";
import { PhotoSkeleton } from "../components/PhotoSkeleton";

interface EventDetailProps {
  token: string | null;
}

const PHOTOS_PER_PAGE = 20;

export function EventDetail({ token }: EventDetailProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EventUpdate>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  // Load initial photos
  useEffect(() => {
    if (!token || !eventId || !event) {
      return;
    }

    let cancelled = false;
    setPhotosLoading(true);
    setPhotos([]);
    setHasMore(true);

    async function loadInitialPhotos() {
      try {
        const response = await getEventPhotos(token!, eventId!, { limit: PHOTOS_PER_PAGE, offset: 0 });
        if (!cancelled) {
          setPhotos(response.photos);
          setHasMore(response.has_more);
        }
      } catch (err) {
        console.error("Failed to load photos:", err);
      } finally {
        if (!cancelled) {
          setPhotosLoading(false);
        }
      }
    }

    loadInitialPhotos();

    return () => {
      cancelled = true;
    };
  }, [token, eventId, event]);

  // Load more photos function
  const loadMorePhotos = useCallback(async () => {
    if (!token || !eventId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const response = await getEventPhotos(token, eventId, { 
        limit: PHOTOS_PER_PAGE, 
        offset: photos.length 
      });
      setPhotos(prev => [...prev, ...response.photos]);
      setHasMore(response.has_more);
    } catch (err) {
      console.error("Failed to load more photos:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [token, eventId, loadingMore, hasMore, photos.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !photosLoading) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, photosLoading, loadMorePhotos]);

  // Load members when modal opens
  useEffect(() => {
    if (!token || !eventId || !showMembers) {
      return;
    }

    let cancelled = false;
    setMembersLoading(true);

    async function loadMembers() {
      try {
        const data = await getEventMembers(token!, eventId!);
        if (!cancelled) {
          setMembers(data);
        }
      } catch (err) {
        console.error("Failed to load members:", err);
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [token, eventId, showMembers]);

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

  function handleNavigatePhoto(photo: Photo) {
    setSelectedPhoto(photo);
  }

  async function handleDeletePhoto(photoId: string) {
    if (!token) return;
    
    // Find next photo BEFORE deleting (use current photos array)
    const currentIndex = photos.findIndex((p) => p.id === photoId);
    const remainingPhotos = photos.filter((p) => p.id !== photoId);
    
    // Determine what to show next
    let nextPhoto: Photo | null = null;
    if (remainingPhotos.length > 0) {
      // Navigate to next photo if available, otherwise previous
      if (currentIndex < remainingPhotos.length) {
        nextPhoto = remainingPhotos[currentIndex];
      } else {
        nextPhoto = remainingPhotos[remainingPhotos.length - 1];
      }
    }
    
    try {
      await deletePhoto(token, photoId);
      
      // Update photos list
      setPhotos(remainingPhotos);
      
      // Update event photo count
      if (event) {
        setEvent({
          ...event,
          photo_count: Math.max(0, event.photo_count - 1),
        });
      }
      
      // Navigate to next photo or close modal
      setSelectedPhoto(nextPhoto);
    } catch (err) {
      console.error("Failed to delete photo:", err);
    }
  }

  function openEditModal() {
    if (!event) return;
    setEditForm({
      name: event.name,
      description: event.description || "",
      location: event.location || "",
      event_date: event.event_date || "",
    });
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleSaveEvent() {
    if (!token || !eventId || !event) return;

    setSaving(true);
    setEditError(null);

    try {
      // Clean up empty strings to null/undefined for proper API handling
      const cleanedData: EventUpdate = {
        name: editForm.name?.trim() || undefined,
        description: editForm.description?.trim() || undefined,
        location: editForm.location?.trim() || undefined,
        event_date: editForm.event_date || undefined,
      };
      
      const updatedEvent = await updateEvent(token, eventId, cleanedData);
      setEvent(updatedEvent);
      setShowEditModal(false);
    } catch (err) {
      setEditError("Failed to update event. You may not have permission.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent() {
    if (!token || !eventId) return;

    setDeletingEvent(true);
    setEditError(null);

    try {
      await deleteEvent(token, eventId);
      navigate("/events");
    } catch (err) {
      setEditError("Failed to delete event. You may not have permission.");
      setDeletingEvent(false);
      setConfirmDeleteEvent(false);
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
    return <LoadingScreen message="Loading event..." />;
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
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-4xl font-bold text-white">{event.name}</h1>
            <button
              onClick={openEditModal}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Edit event"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          </div>
          
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
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-2 hover:text-purple-300 transition-colors"
            >
              👥 {event.member_count} members
            </button>
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
            /* Skeleton loading - instant visual feedback */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <PhotoSkeleton count={12} />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">📷</p>
              <p>No photos yet. Be the first to upload!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => handlePhotoClick(photo)}
                    className="group relative aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <img
                      src={photo.thumb_url || photo.url}
                      alt="Event photo"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Fall back to original URL if thumbnail doesn't exist
                        const target = e.target as HTMLImageElement;
                        if (target.src !== photo.url) {
                          target.src = photo.url;
                        }
                      }}
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
                {/* Loading more skeletons */}
                {loadingMore && <PhotoSkeleton count={4} />}
              </div>
              
              {/* Infinite scroll trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="h-10 mt-4" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          photos={photos}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={handleNavigatePhoto}
          onDelete={handleDeletePhoto}
        />
      )}

      {/* Members Modal */}
      {showMembers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-white/20 w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">
                Members ({event.member_count})
              </h2>
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4">
              {membersLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Spinner size="md" />
                  <p className="text-gray-400">Loading members...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No members found
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                    >
                      {/* Avatar */}
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.name || member.email}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(member.name?.[0] || member.email[0]).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {member.name || member.email.split("@")[0]}
                        </p>
                        <p className="text-gray-400 text-sm truncate">
                          {member.email}
                        </p>
                      </div>

                      {/* Role Badge */}
                      {member.role === "admin" && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl border border-white/20 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Edit Event</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-2">Event Name</label>
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="Event name"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="What's this event about?"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Location</label>
                <input
                  type="text"
                  value={editForm.location || ""}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  placeholder="Where is it happening?"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Date</label>
                <input
                  type="date"
                  value={editForm.event_date || ""}
                  onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Delete Event */}
              <div className="pt-4 mt-4 border-t border-white/10">
                {confirmDeleteEvent ? (
                  <div className="flex items-center gap-3">
                    <span className="text-red-300 text-sm">Delete this event and all photos?</span>
                    <button
                      onClick={handleDeleteEvent}
                      disabled={deletingEvent}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingEvent ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteEvent(false)}
                      disabled={deletingEvent}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteEvent(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    Delete Event
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || !editForm.name?.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

