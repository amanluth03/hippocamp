// API URL configuration
// - Production: Uses /api path (same domain via CloudFront routing)
// - Development: Uses localhost:8000 or network IP:8000
const isProduction = import.meta.env.PROD;
const API_URL = isProduction
  ? "/api"
  : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : `http://${window.location.hostname}:8000`;

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user");
  }

  return response.json();
}

export function getGoogleLoginUrl(): string {
  return `${API_URL}/auth/google/login`;
}

// Events API

export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  event_date?: string;
  invite_code: string;
  created_by?: string;
  created_at?: string;
  member_count: number;
  photo_count: number;
}

export interface EventCreate {
  name: string;
  description?: string;
  location?: string;
  event_date?: string;
}

export async function getEvents(token: string): Promise<Event[]> {
  const response = await fetch(`${API_URL}/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get events");
  }

  return response.json();
}

export async function getEvent(token: string, eventId: string): Promise<Event> {
  const response = await fetch(`${API_URL}/events/${eventId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get event");
  }

  return response.json();
}

export async function createEvent(token: string, data: EventCreate): Promise<Event> {
  const response = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create event");
  }

  return response.json();
}

export async function joinEvent(token: string, inviteCode: string): Promise<{ message: string; event: Event }> {
  const response = await fetch(`${API_URL}/events/join/${inviteCode}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to join event");
  }

  return response.json();
}

export interface EventUpdate {
  name?: string;
  description?: string;
  location?: string;
  event_date?: string;
}

export async function updateEvent(
  token: string,
  eventId: string,
  data: EventUpdate
): Promise<Event> {
  const response = await fetch(`${API_URL}/events/${eventId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update event");
  }

  return response.json();
}

export async function deleteEvent(
  token: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/events/${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete event");
  }
}

// Event Members API

export interface EventMember {
  id: string;
  user_id: string;
  name?: string;
  email: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
}

export async function getEventMembers(
  token: string,
  eventId: string
): Promise<EventMember[]> {
  const response = await fetch(`${API_URL}/events/${eventId}/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get members");
  }

  return response.json();
}

// Photos API

export interface Photo {
  id: string;
  event_id: string;
  uploaded_by: string;
  url: string;
  thumbnail_url?: string;
  taken_at?: string;
  uploaded_at: string;
  is_memory: boolean;
  uploader_name?: string;
  uploader_email?: string;
}

export async function uploadPhoto(
  token: string,
  eventId: string,
  file: File
): Promise<Photo> {
  const formData = new FormData();
  formData.append("event_id", eventId);
  formData.append("file", file);

  const response = await fetch(`${API_URL}/photos/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload photo");
  }

  return response.json();
}

export async function getEventPhotos(
  token: string,
  eventId: string
): Promise<Photo[]> {
  const response = await fetch(`${API_URL}/photos/event/${eventId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get photos");
  }

  return response.json();
}

export async function deletePhoto(
  token: string,
  photoId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/photos/${photoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete photo");
  }
}

// Flashbacks API

export interface FlashbackPhoto {
  id: string;
  url: string;
  uploaded_at: string;
  years_ago: number;
  event_id: string;
  event_name: string;
  uploader_name?: string;
}

export interface FlashbackGroup {
  years_ago: number;
  label: string;
  photos: FlashbackPhoto[];
}

export interface FlashbacksResponse {
  date: string;
  has_flashbacks: boolean;
  groups: FlashbackGroup[];
}

export async function getFlashbacks(token: string): Promise<FlashbacksResponse> {
  const response = await fetch(`${API_URL}/flashbacks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get flashbacks");
  }

  return response.json();
}

// Memories API

export interface Memory {
  id: string;
  user_id: string;
  event_id?: string;
  url: string;
  thumbnail_url?: string;
  taken_at?: string;
  uploaded_at: string;
  event_name?: string;
  extra_data?: Record<string, unknown>;
}

export async function getMemories(
  token: string,
  options?: { limit?: number; offset?: number; eventId?: string }
): Promise<Memory[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset) params.append("offset", options.offset.toString());
  if (options?.eventId) params.append("event_id", options.eventId);

  const response = await fetch(`${API_URL}/memories?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get memories");
  }

  return response.json();
}

export async function uploadMemory(
  token: string,
  file: File,
  eventId?: string
): Promise<Memory> {
  const formData = new FormData();
  formData.append("file", file);
  if (eventId) {
    formData.append("event_id", eventId);
  }

  const response = await fetch(`${API_URL}/memories/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload memory");
  }

  return response.json();
}

export async function deleteMemory(
  token: string,
  memoryId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/memories/${memoryId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete memory");
  }
}

export async function updateMemory(
  token: string,
  memoryId: string,
  eventId?: string | null
): Promise<Memory> {
  const params = new URLSearchParams();
  if (eventId !== undefined) {
    if (eventId === null) {
      // Unlink from event - don't add param
    } else {
      params.append("event_id", eventId);
    }
  }

  const response = await fetch(`${API_URL}/memories/${memoryId}?${params}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to update memory");
  }

  return response.json();
}

// Feed API
export interface FeedItem {
  id: string;
  type: "event_photo" | "memory";
  url: string;
  thumbnail_url?: string;
  uploaded_at: string;
  event_id?: string;
  event_name?: string;
  uploader_name?: string;
  is_personal: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
  has_more: boolean;
  next_offset: number;
}

export async function getFeed(
  token: string,
  limit: number = 20,
  offset: number = 0
): Promise<FeedResponse> {
  const response = await fetch(
    `${API_URL}/feed?limit=${limit}&offset=${offset}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch feed");
  }

  return response.json();
}

