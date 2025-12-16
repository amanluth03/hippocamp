import { Link } from "react-router-dom";
import { User, getGoogleLoginUrl } from "../services/api";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface HomeProps {
  user: User | null;
  loading: boolean;
  onLogout: () => void;
}

export function Home({ user, loading, onLogout }: HomeProps) {
  const { isSupported, permission, requestPermission } = usePushNotifications();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 mb-4">
            🦛 Hippo Campus
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            Capture moments. Share memories. Relive the magic.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-white mb-2">Event Albums</h3>
            <p className="text-gray-400">
              Create shared albums for parties, trips, and gatherings. Everyone can contribute.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-white mb-2">Flashbacks</h3>
            <p className="text-gray-400">
              Relive your favorite moments with daily memory notifications.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">Easy Sharing</h3>
            <p className="text-gray-400">
              Invite friends with a simple link. No app download required.
            </p>
          </div>
        </div>

        {/* Auth Section */}
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/events"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
              >
                View My Events
              </Link>
              <Link
                to="/memories"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
              >
                📸 My Memories
              </Link>
              <Link
                to="/flashbacks"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 border border-white/20"
              >
                ✨ Flashbacks
              </Link>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <span className="text-white font-medium">{user.name}</span>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>

            {/* Notification Permission */}
            {isSupported && permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="mt-4 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-sm"
              >
                🔔 Enable memory notifications
              </button>
            )}
            {isSupported && permission === 'granted' && (
              <p className="mt-4 text-green-400 text-sm flex items-center gap-2">
                ✓ Notifications enabled
              </p>
            )}
          </div>
        ) : (
          <a
            href={getGoogleLoginUrl()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
          >
            Sign in with Google
          </a>
        )}
      </div>
    </div>
  );
}

