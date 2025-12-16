import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Memory, getMemories, uploadMemory, deleteMemory, getEvents, Event } from "../services/api";
import { Spinner } from "../components/Spinner";
import { PhotoModal } from "../components/PhotoModal";

interface MemoriesProps {
  token: string | null;
}

export function Memories({ token }: MemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setLoading(true);

    async function loadData() {
      try {
        const [memoriesData, eventsData] = await Promise.all([
          getMemories(token!),
          getEvents(token!),
        ]);
        if (!cancelled) {
          setMemories(memoriesData);
          setEvents(eventsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load memories");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleFileSelect(files: FileList | null, eventId?: string) {
    if (!files || files.length === 0 || !token) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadMemory(token, file, eventId)
      );
      const newMemories = await Promise.all(uploadPromises);
      setMemories((prev) => [...newMemories, ...prev]);
      setShowUploadModal(false);
    } catch (err) {
      setError("Failed to upload some memories");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMemory(memoryId: string) {
    if (!token) return;

    try {
      await deleteMemory(token, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      setSelectedMemory(null);
    } catch (err) {
      setError("Failed to delete memory");
    }
  }

  function handleQuickUpload() {
    fileInputRef.current?.click();
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Please sign in to view memories</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Hidden file input for quick upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400"
          >
            🦛 Hippo Campus
          </Link>
          <div className="flex gap-3">
            <Link
              to="/events"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors"
            >
              Events
            </Link>
            <Link
              to="/flashbacks"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors"
            >
              ✨ Flashbacks
            </Link>
          </div>
        </div>

        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Memories</h1>
            <p className="text-gray-400">Your personal photo archive</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-colors font-semibold flex items-center gap-2"
          >
            <span className="text-xl">+</span> Save Memory
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <div className="mb-4 p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-200 flex items-center gap-3">
            <Spinner size="sm" />
            Uploading memories...
          </div>
        )}

        {/* Memories Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner size="lg" />
            <p className="text-gray-400">Loading memories...</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <p className="text-gray-400 text-lg mb-2">No memories yet</p>
            <p className="text-gray-500 mb-6">
              Save photos from your camera roll to start building your memory archive
            </p>
            <button
              onClick={handleQuickUpload}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl transition-colors font-semibold"
            >
              + Save Your First Memory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {memories.map((memory) => (
              <div
                key={memory.id}
                onClick={() => setSelectedMemory(memory)}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all relative group"
              >
                <img
                  src={memory.url}
                  alt="Memory"
                  className="w-full h-full object-cover"
                />
                {/* Event badge */}
                {memory.event_name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      📁 {memory.event_name}
                    </p>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button (mobile) */}
        <button
          onClick={handleQuickUpload}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl md:hidden"
        >
          +
        </button>
      </div>

      {/* Photo Modal */}
      {selectedMemory && (
        <PhotoModal
          photo={{
            id: selectedMemory.id,
            url: selectedMemory.url,
            thumbnail_url: selectedMemory.thumbnail_url,
            uploaded_at: selectedMemory.uploaded_at,
            uploader_name: "You",
            uploader_email: "",
          }}
          photos={memories.map((m) => ({
            id: m.id,
            url: m.url,
            thumbnail_url: m.thumbnail_url,
            uploaded_at: m.uploaded_at,
            uploader_name: "You",
            uploader_email: "",
          }))}
          onClose={() => setSelectedMemory(null)}
          onNavigate={(photo) => {
            const memory = memories.find((m) => m.id === photo.id);
            if (memory) setSelectedMemory(memory);
          }}
          onDelete={async (photoId) => {
            await handleDeleteMemory(photoId);
          }}
          canDelete={true}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadMemoryModal
          events={events}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileSelect}
          uploading={uploading}
        />
      )}
    </div>
  );
}

// Upload Memory Modal Component
function UploadMemoryModal({
  events,
  onClose,
  onUpload,
  uploading,
}: {
  events: Event[];
  onClose: () => void;
  onUpload: (files: FileList | null, eventId?: string) => void;
  uploading: boolean;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    setSelectedFiles(files);

    // Generate previews
    if (files) {
      const urls = Array.from(files).map((file) => URL.createObjectURL(file));
      setPreviews(urls);
    } else {
      setPreviews([]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onUpload(selectedFiles, selectedEventId || undefined);
  }

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-white/20 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Save Memory</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-gray-300 mb-2">Select Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white hover:file:bg-purple-600 file:cursor-pointer"
            />
          </div>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Preview ${i + 1}`}
                  className="aspect-square object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Optional Event Link */}
          <div>
            <label className="block text-gray-300 mb-2">
              Also add to event? <span className="text-gray-500">(optional)</span>
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">None (personal only)</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFiles || selectedFiles.length === 0 || uploading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" /> Uploading...
                </>
              ) : (
                `Save ${selectedFiles?.length || 0} ${
                  selectedFiles?.length === 1 ? "Photo" : "Photos"
                }`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

