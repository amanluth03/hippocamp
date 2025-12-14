import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Event, getEvent } from "../services/api";

interface EventDetailProps {
  token: string | null;
}

export function EventDetail({ token }: EventDetailProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  function copyInviteCode() {
    if (event) {
      navigator.clipboard.writeText(event.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

        {/* Photos Section (placeholder for now) */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Photos</h2>
            <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-colors">
              + Upload Photos
            </button>
          </div>
          
          {event.photo_count === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">📷</p>
              <p>No photos yet. Be the first to upload!</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Photo gallery coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

