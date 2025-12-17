import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { uploadMemory, getEvents, Event } from "../services/api";
import { Spinner } from "../components/Spinner";

interface ShareTargetProps {
  token: string | null;
}

export function ShareTarget({ token }: ShareTargetProps) {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Extract shared files from the URL/form data
  useEffect(() => {
    async function handleSharedFiles() {
      try {
        // Check if we're receiving files via the Share Target API
        if ("launchQueue" in window && "LaunchParams" in window) {
          // @ts-ignore - LaunchQueue API
          window.launchQueue.setConsumer(async (launchParams: any) => {
            if (launchParams.files && launchParams.files.length > 0) {
              const sharedFiles: File[] = [];
              for (const fileHandle of launchParams.files) {
                const file = await fileHandle.getFile();
                sharedFiles.push(file);
              }
              setFiles(sharedFiles);
              
              // Generate previews
              const urls = sharedFiles.map((file) => URL.createObjectURL(file));
              setPreviews(urls);
            }
          });
        }

        // Also check for files in the service worker cache (fallback method)
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          const cache = await caches.open("share-target-cache");
          const requests = await cache.keys();
          
          if (requests.length > 0) {
            const sharedFiles: File[] = [];
            
            for (const request of requests) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                const filename = request.url.split("/").pop() || "shared-photo.jpg";
                const file = new File([blob], filename, { type: blob.type });
                sharedFiles.push(file);
              }
            }
            
            // Clear the cache
            for (const request of requests) {
              await cache.delete(request);
            }
            
            if (sharedFiles.length > 0) {
              setFiles(sharedFiles);
              const urls = sharedFiles.map((file) => URL.createObjectURL(file));
              setPreviews(urls);
            }
          }
        }
      } catch (err) {
        console.error("Error handling shared files:", err);
      }
    }

    handleSharedFiles();
  }, []);

  // Load events for optional linking
  useEffect(() => {
    if (!token) {
      setLoadingEvents(false);
      return;
    }

    async function loadEvents() {
      try {
        const data = await getEvents(token!);
        setEvents(data);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [token]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  async function handleSave() {
    if (!token || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map((file) =>
        uploadMemory(token, file, selectedEventId || undefined)
      );
      await Promise.all(uploadPromises);
      setSuccess(true);
      
      // Redirect to memories after a short delay
      setTimeout(() => {
        navigate("/memories");
      }, 1500);
    } catch (err) {
      setError("Failed to save some photos. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleCancel() {
    // Clean up and go back
    previews.forEach((url) => URL.revokeObjectURL(url));
    navigate(-1);
  }

  function handleAddMore(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = e.target.files;
    if (!newFiles) return;

    const fileArray = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileArray]);
    
    const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function handleRemoveFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // Not authenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">🦛</div>
        <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
        <p className="text-gray-400 text-center mb-6">
          Please sign in to save photos to your memories.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Saved!</h1>
        <p className="text-gray-400">
          {files.length} {files.length === 1 ? "photo" : "photos"} saved to your memories.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 pt-safe pb-safe">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📸</div>
          <h1 className="text-2xl font-bold text-white mb-1">Save to Memories</h1>
          <p className="text-gray-400 text-sm">
            {files.length > 0
              ? `${files.length} ${files.length === 1 ? "photo" : "photos"} ready to save`
              : "Select photos to save"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Photo previews */}
        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {previews.map((url, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            {/* Add more button */}
            <label className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors">
              <span className="text-2xl text-gray-400">+</span>
              <span className="text-xs text-gray-500">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddMore}
              />
            </label>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block w-full py-12 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors text-center">
              <span className="text-4xl block mb-2">📷</span>
              <span className="text-gray-400">Tap to select photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddMore}
              />
            </label>
          </div>
        )}

        {/* Event selection */}
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 text-sm">
            Add to an event? <span className="text-gray-500">(optional)</span>
          </label>
          {loadingEvents ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Spinner size="sm" /> Loading events...
            </div>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">None (personal only)</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={files.length === 0 || uploading}
            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Spinner size="sm" /> Saving...
              </>
            ) : (
              `Save ${files.length > 0 ? files.length : ""} ${files.length === 1 ? "Photo" : "Photos"}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

