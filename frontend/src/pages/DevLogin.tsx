import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface DevLoginProps {
  onLogin: (token: string) => void;
}

// Check if we're in production
const isProduction = import.meta.env.PROD;

// Get API URL (same logic as api.ts)
const API_URL = window.location.hostname === "localhost" 
  ? "http://localhost:8000"
  : `http://${window.location.hostname}:8000`;

export function DevLogin({ onLogin }: DevLoginProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Redirect to home if accessed in production
  useEffect(() => {
    if (isProduction) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Don't render anything in production
  if (isProduction) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/dev/login?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();
      onLogin(data.token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <h1 className="text-2xl font-bold text-white mb-2">🦛 Dev Login</h1>
        <p className="text-gray-400 mb-6 text-sm">
          For mobile testing. Sign in with Google on desktop first to create your account.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-gray-500 text-xs mt-4 text-center">
          Only works in development mode
        </p>
      </div>
    </div>
  );
}

