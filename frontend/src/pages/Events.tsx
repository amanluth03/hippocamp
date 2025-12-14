import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Event, getEvents, createEvent, joinEvent, EventCreate } from "../services/api";

interface EventsProps {
  token: string | null;
}

export function Events({ token }: EventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    
    // Clear stale state before new fetch
    setError(null);
    setLoading(true);

    async function loadEvents() {
      try {
        const data = await getEvents(token!);
        if (!cancelled) {
          setEvents(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load events");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCreateEvent(data: EventCreate): Promise<string | null> {
    if (!token) return "No authentication token";
    try {
      const newEvent = await createEvent(token, data);
      setEvents((prevEvents) => [...prevEvents, newEvent]);
      return null; // Success
    } catch (err) {
      return "Failed to create event. Please try again.";
    }
  }

  async function handleJoinEvent(inviteCode: string): Promise<string | null> {
    if (!token) return "No authentication token";
    try {
      const result = await joinEvent(token, inviteCode);
      // Check if already in list and add if not
      setEvents((prevEvents) => {
        if (prevEvents.find((e) => e.id === result.event.id)) {
          return prevEvents; // Already exists, no change
        }
        return [...prevEvents, result.event];
      });
      return null; // Success
    } catch (err) {
      return "Failed to join event. Check the invite code.";
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Please sign in to view events</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
            🦛 Hippo Campus
          </Link>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors"
            >
              Join Event
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-colors"
            >
              + Create Event
            </button>
          </div>
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

        {/* Events Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No events yet</p>
            <p className="text-gray-500">Create your first event or join one with an invite code!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 hover:border-purple-400/50 transition-all hover:scale-[1.02]"
              >
                <h3 className="text-xl font-semibold text-white mb-2">{event.name}</h3>
                {event.location && (
                  <p className="text-gray-400 text-sm mb-1">📍 {event.location}</p>
                )}
                {event.event_date && (
                  <p className="text-gray-400 text-sm mb-3">📅 {new Date(event.event_date).toLocaleDateString()}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>👥 {event.member_count} members</span>
                  <span>📸 {event.photo_count} photos</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            const error = await handleCreateEvent(data);
            if (!error) {
              setShowCreateModal(false);
            }
            return error;
          }}
        />
      )}

      {/* Join Event Modal */}
      {showJoinModal && (
        <JoinEventModal
          onClose={() => setShowJoinModal(false)}
          onJoin={async (inviteCode) => {
            const error = await handleJoinEvent(inviteCode);
            if (!error) {
              setShowJoinModal(false);
            }
            return error;
          }}
        />
      )}
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: EventCreate) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    
    const errorMsg = await onCreate({
      name,
      description: description || undefined,
      location: location || undefined,
      event_date: eventDate || undefined,
    });
    
    setSubmitting(false);
    
    if (errorMsg) {
      setError(errorMsg);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-4">Create Event</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Event Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              placeholder="Birthday Party"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              placeholder="What's this event about?"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Join Event Modal Component
function JoinEventModal({
  onClose,
  onJoin,
}: {
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<string | null>;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    
    const errorMsg = await onJoin(inviteCode.trim());
    
    setSubmitting(false);
    
    if (errorMsg) {
      setError(errorMsg);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-4">Join Event</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 text-center text-lg tracking-wider"
              placeholder="ABC123XY"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Joining..." : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

