import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, getGoogleLoginUrl, getFeed, FeedItem } from "../services/api";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Spinner } from "../components/Spinner";

interface HomeProps {
  user: User | null;
  loading: boolean;
  onLogout: () => void;
  token?: string | null;
}

// Check if we're in development mode AND on a mobile/network device (not localhost)
// This enables dev login only in development for mobile testing
const isProduction = import.meta.env.PROD;
const isNetworkAccess = !isProduction && 
  window.location.hostname !== "localhost" && 
  window.location.hostname !== "127.0.0.1";

export function Home({ user, loading, onLogout, token }: HomeProps) {
  const navigate = useNavigate();

  const handleSignIn = () => {
    // In production, always use Google OAuth
    // In development on network (mobile testing), use dev login
    if (isNetworkAccess) {
      navigate("/dev/login");
    } else {
      window.location.href = getGoogleLoginUrl();
    }
  };

  // If user is logged in, show the feed
  if (user && token) {
    return <HomeFeed user={user} token={token} onLogout={onLogout} />;
  }

  // Landing page for logged-out users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="min-h-screen overflow-y-auto px-4 py-8 pt-safe pb-safe">
        {/* Logo/Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 mb-2">
            🦛 Hippo Campus
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Capture moments. Share memories.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:max-w-4xl sm:mx-auto">
          <div className="flex-shrink-0 w-[70vw] sm:w-auto snap-center bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">📸</div>
            <h3 className="text-base font-semibold text-white mb-1">Event Albums</h3>
            <p className="text-gray-400 text-sm">
              Shared albums for parties and gatherings.
            </p>
          </div>

          <div className="flex-shrink-0 w-[70vw] sm:w-auto snap-center bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">✨</div>
            <h3 className="text-base font-semibold text-white mb-1">Flashbacks</h3>
            <p className="text-gray-400 text-sm">
              Relive moments with memory notifications.
            </p>
          </div>

          <div className="flex-shrink-0 w-[70vw] sm:w-auto snap-center bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">🔗</div>
            <h3 className="text-base font-semibold text-white mb-1">Easy Sharing</h3>
            <p className="text-gray-400 text-sm">
              Invite friends with a link. No app needed.
            </p>
          </div>
        </div>

        {/* Auth Section */}
        {loading ? (
          <div className="text-gray-400 text-center">Loading...</div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSignIn}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full text-lg shadow-lg"
            >
              Sign In
            </button>
            {!isNetworkAccess && (
              <p className="text-gray-500 text-xs">Uses Google OAuth</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Feed component for logged-in users
function HomeFeed({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const { isSupported, permission, requestPermission } = usePushNotifications();

  const loadFeed = useCallback(async (isLoadMore = false) => {
    if (!token) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const currentOffset = isLoadMore ? offset : 0;
      const data = await getFeed(token, 20, currentOffset);
      
      if (isLoadMore) {
        setFeedItems(prev => [...prev, ...data.items]);
      } else {
        setFeedItems(data.items);
      }
      
      setHasMore(data.has_more);
      setOffset(data.next_offset);
    } catch (err) {
      setError("Failed to load feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, offset]);

  useEffect(() => {
    loadFeed();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-3 pt-safe">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            🦛 Hippo Campus
          </h1>
          <div className="flex items-center gap-3">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-4xl mx-auto">
        {/* Notification prompt */}
        {isSupported && permission !== 'granted' && (
          <button
            onClick={requestPermission}
            className="w-full mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm flex items-center justify-center gap-2 hover:bg-purple-500/30 transition-colors"
          >
            🔔 Enable notifications for flashbacks
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner size="lg" />
            <p className="text-gray-400">Loading your feed...</p>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-semibold text-white mb-2">Your feed is empty</h2>
            <p className="text-gray-400 mb-6">
              Start by saving memories or joining events!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/memories"
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold"
              >
                📸 Save a Memory
              </Link>
              <Link
                to="/events"
                className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold"
              >
                📅 Browse Events
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Masonry-style grid */}
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {feedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-xl"
                >
                  <img
                    src={item.url}
                    alt=""
                    className="w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-medium truncate">
                        {item.event_name || "Personal Memory"}
                      </p>
                      <p className="text-gray-300 text-xs">
                        {item.is_personal ? "You" : item.uploader_name}
                      </p>
                    </div>
                  </div>
                  {/* Badge for personal memories */}
                  {item.is_personal && (
                    <div className="absolute top-2 right-2 bg-purple-500/80 text-white text-xs px-2 py-0.5 rounded-full">
                      ✨ Memory
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => loadFeed(true)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Spinner size="sm" /> Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Full-screen photo viewer */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl z-50"
          >
            ×
          </button>
          <div
            className="max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedItem.url}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-center">
              <p className="text-white font-medium">
                {selectedItem.event_name || "Personal Memory"}
              </p>
              <p className="text-gray-400 text-sm">
                {selectedItem.is_personal ? "Saved by you" : `By ${selectedItem.uploader_name}`}
                {" • "}
                {new Date(selectedItem.uploaded_at).toLocaleDateString()}
              </p>
              {selectedItem.event_id && (
                <Link
                  to={`/events/${selectedItem.event_id}`}
                  className="inline-block mt-2 text-purple-400 hover:text-purple-300 text-sm"
                >
                  View Event →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
