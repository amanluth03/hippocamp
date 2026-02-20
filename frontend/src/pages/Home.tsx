import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, getFeed, FeedItem, searchPhotos, SearchResultItem, SearchInterpretation, deleteAccount } from "../services/api";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { Spinner } from "../components/Spinner";
import { PhotoSkeleton } from "../components/PhotoSkeleton";
import { LazyImage } from "../components/LazyImage";

interface HomeProps {
  user: User | null;
  loading: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onAppleLogin?: () => void;
  token?: string | null;
}

// Check if we're in development mode AND on a mobile/network device (not localhost)
// This enables dev login only in development for mobile testing
const isProduction = import.meta.env.PROD;
const isNetworkAccess = !isProduction && 
  window.location.hostname !== "localhost" && 
  window.location.hostname !== "127.0.0.1";

export function Home({ user, loading, onLogout, onLogin, onAppleLogin, token }: HomeProps) {
  const navigate = useNavigate();

  const handleSignIn = () => {
    // In production, always use Google OAuth (via onLogin which handles Capacitor)
    // In development on network (mobile testing), use dev login
    if (isNetworkAccess) {
      navigate("/dev/login");
    } else {
      onLogin();
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
              className="w-64 bg-white text-gray-800 font-semibold py-4 px-8 rounded-full text-lg shadow-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
            {onAppleLogin && (
              <button
                onClick={onAppleLogin}
                className="w-64 bg-black text-white font-semibold py-4 px-8 rounded-full text-lg shadow-lg flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Sign in with Apple
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Feed component for logged-in users
function HomeFeed({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const { isSupported, permission, requestPermission } = usePushNotifications();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchInterpretation, setSearchInterpretation] = useState<SearchInterpretation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Search handler with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      setSearchInterpretation(null);
      return;
    }
    
    setIsSearchMode(true);
    setIsSearching(true);
    
    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchPhotos(token, query.trim());
        setSearchResults(response.results);
        setSearchInterpretation(response.interpretation || null);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
        setSearchInterpretation(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [token]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchInterpretation(null);
    setIsSearchMode(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

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
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </button>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
            
            {showAccountMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <p className="text-white text-sm font-medium truncate">{user.name}</p>
                  <p className="text-gray-400 text-xs truncate">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-3 text-gray-300 hover:bg-white/5 text-sm transition-colors"
                >
                  Sign out
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="p-3 bg-red-500/10 border-t border-red-500/20">
                    <p className="text-red-300 text-xs mb-2">This will permanently delete your account and all your data.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setDeleting(true);
                          try {
                            await deleteAccount(token);
                            onLogout();
                          } catch (err) {
                            alert("Failed to delete account. Please try again.");
                            setDeleting(false);
                          }
                        }}
                        disabled={deleting}
                        className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
                      >
                        {deleting ? "Deleting..." : "Yes, Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded-lg disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Try: beach, last week, summer 2025, happy moments..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-4xl mx-auto">
        {/* Notification prompt - only show when not searching */}
        {!isSearchMode && isSupported && permission !== 'granted' && (
          <button
            onClick={requestPermission}
            className="w-full mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 text-sm flex items-center justify-center gap-2 hover:bg-purple-500/30 transition-colors"
          >
            🔔 Enable notifications for flashbacks
          </button>
        )}

        {/* Error */}
        {error && !isSearchMode && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Search Results */}
        {isSearchMode ? (
          <div>
            {/* Search header */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm">
                {isSearching ? (
                  "Understanding your search..."
                ) : searchResults.length > 0 ? (
                  <>Found <span className="text-white font-medium">{searchResults.length}</span> photos</>
                ) : (
                  <>No photos found</>
                )}
              </p>
              
              {/* Show interpretation */}
              {!isSearching && searchInterpretation && (
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  {searchInterpretation.date_start && searchInterpretation.date_end && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                      📅 {new Date(searchInterpretation.date_start).toLocaleDateString()} - {new Date(searchInterpretation.date_end).toLocaleDateString()}
                    </span>
                  )}
                  {searchInterpretation.keywords.length > 0 && (
                    searchInterpretation.keywords.map((keyword) => (
                      <span key={keyword} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                        🏷️ {keyword}
                      </span>
                    ))
                  )}
                  {searchInterpretation.used_ai && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                      ✨ AI-enhanced
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Search results grid */}
            {isSearching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <PhotoSkeleton count={8} />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold text-white mb-2">No matches found</h2>
                <p className="text-gray-400 mb-4">
                  Try searching by keywords or time:
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {["beach", "birthday", "sunset", "friends", "food"].map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-full text-sm transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-sm mb-2">Or try natural language:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["last week", "this month", "summer 2025"].map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-full text-sm transition-colors"
                    >
                      📅 {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {searchResults.map((item) => (
                  <LazyImage
                    key={item.id}
                    src={item.thumbnail_url || item.url}
                    fallbackSrc={item.url}
                    className="aspect-square cursor-pointer group relative overflow-hidden rounded-xl border border-white/10"
                    onClick={() => setSelectedItem({
                      id: item.id,
                      type: item.type,
                      url: item.url,
                      thumbnail_url: item.thumbnail_url,
                      uploaded_at: item.uploaded_at,
                      event_id: item.event_id,
                      event_name: item.event_name,
                      uploader_name: item.uploader_name,
                      is_personal: item.is_personal,
                    })}
                  >
                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none">
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
                      <div className="absolute top-2 right-2 bg-purple-500/80 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none z-10">
                        ✨ Memory
                      </div>
                    )}
                  </LazyImage>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Normal Feed View */
          <>
            {/* Loading */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <PhotoSkeleton count={12} />
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
                {/* Photo grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {feedItems.map((item) => (
                    <LazyImage
                      key={item.id}
                      src={item.thumbnail_url || item.url}
                      fallbackSrc={item.url}
                      className="aspect-square cursor-pointer group relative overflow-hidden rounded-xl border border-white/10"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Overlay with info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none">
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
                        <div className="absolute top-2 right-2 bg-purple-500/80 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none z-10">
                          ✨ Memory
                        </div>
                      )}
                    </LazyImage>
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
