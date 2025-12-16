import { Link, useNavigate } from "react-router-dom";
import { User, getGoogleLoginUrl } from "../services/api";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface HomeProps {
  user: User | null;
  loading: boolean;
  onLogout: () => void;
}

// Check if we're on a mobile/network device (not localhost)
const isNetworkAccess = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

export function Home({ user, loading, onLogout }: HomeProps) {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const navigate = useNavigate();

  const handleSignIn = () => {
    if (isNetworkAccess) {
      // On mobile/network, redirect to dev login
      navigate("/dev/login");
    } else {
      // On localhost, use Google OAuth
      window.location.href = getGoogleLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Scrollable content */}
      <div className="min-h-screen overflow-y-auto px-4 py-8 pt-safe pb-safe">
        {/* Logo/Title - Compact on mobile */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 mb-2">
            🦛 Hippo Campus
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300">
            Capture moments. Share memories.
          </p>
        </div>

        {/* Feature Cards - Horizontal scroll on mobile */}
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
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            {/* User info */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-white text-sm font-medium">{user.name}</span>
            </div>

            {/* Navigation buttons - always visible */}
            <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
              <Link
                to="/events"
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full text-center shadow-lg"
              >
                📅 My Events
              </Link>
              <Link
                to="/memories"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-full text-center shadow-lg"
              >
                📸 My Memories
              </Link>
              <Link
                to="/flashbacks"
                className="bg-white/10 text-white font-semibold py-3 px-6 rounded-full text-center border border-white/20"
              >
                ✨ Flashbacks
              </Link>
            </div>

            {/* Sign out */}
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors text-sm mt-2"
            >
              Sign out
            </button>

            {/* Notification Permission */}
            {isSupported && permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-sm"
              >
                🔔 Enable notifications
              </button>
            )}
            {isSupported && permission === 'granted' && (
              <p className="text-green-400 text-sm">✓ Notifications enabled</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSignIn}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full text-lg shadow-lg"
            >
              Sign In
            </button>
            {!isNetworkAccess && (
              <p className="text-gray-500 text-xs">
                Uses Google OAuth
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

