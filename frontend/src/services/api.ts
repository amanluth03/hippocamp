import { compressImageForUpload } from "../utils/imageCompression";
import { Capacitor } from "@capacitor/core";

// API URL configuration
// - Production: Uses /api path (same domain via CloudFront routing)
// - Development: Uses localhost:8000 or network IP:8000
// - Capacitor (iOS): Uses full URL since we're not on the same domain
const isProduction = import.meta.env.PROD;
const isCapacitor = Capacitor.isNativePlatform();

// Full API URL for external/Capacitor use
export const API_BASE_URL = "https://thehippocampus.net/api";

// API URL for fetch requests (relative in browser, absolute in Capacitor)
const API_URL = isCapacitor
  ? API_BASE_URL
  : isProduction
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
  const url = `${API_URL}/auth/me`;
  console.log("getCurrentUser: fetching from", url);
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("getCurrentUser: response status", response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.error("getCurrentUser: error response body:", text);
      throw new Error(`Failed to get user: ${response.status} ${text}`);
    }

    const data = await response.json();
    console.log("getCurrentUser: success, user email:", data.email);
    return data;
  } catch (error) {
    console.error("getCurrentUser: fetch error:", error);
    throw error;
  }
}

export function getGoogleLoginUrl(): string {
  // In Capacitor, we need the full URL for external browser
  // Also add a redirect hint for the native app
  if (isCapacitor) {
    return `${API_BASE_URL}/auth/google/login?redirect_scheme=hippocampus`;
  }
  return `${API_URL}/auth/google/login`;
}

// Helper to check if running in native app
export function isNativeApp(): boolean {
  return isCapacitor;
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
  url: string;  // Original full-size
  thumb_url?: string;  // 300px thumbnail for grid
  medium_url?: string;  // 1200px for detail view
  thumbnail_url?: string;  // Legacy field
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
  // Compress image before upload for faster transfer
  const compressedFile = await compressImageForUpload(file);
  
  const formData = new FormData();
  formData.append("event_id", eventId);
  formData.append("file", compressedFile);

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

export interface PaginatedPhotosResponse {
  photos: Photo[];
  total: number;
  has_more: boolean;
}

export async function getEventPhotos(
  token: string,
  eventId: string,
  options?: { limit?: number; offset?: number }
): Promise<PaginatedPhotosResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset) params.append("offset", options.offset.toString());
  
  const url = `${API_URL}/photos/event/${eventId}${params.toString() ? `?${params}` : ''}`;
  
  const response = await fetch(url, {
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
  thumbnail_url?: string;
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
  url: string;  // Original full-size
  thumb_url?: string;  // 300px thumbnail for grid
  medium_url?: string;  // 1200px for detail view
  thumbnail_url?: string;  // Legacy field
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
  // Compress image before upload for faster transfer
  const compressedFile = await compressImageForUpload(file);
  
  const formData = new FormData();
  formData.append("file", compressedFile);
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
  ai_labels?: string[];
  ai_description?: string;
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

// Search API
export interface SearchResultItem {
  id: string;
  type: "event_photo" | "memory";
  url: string;
  thumbnail_url?: string;
  uploaded_at: string;
  event_id?: string;
  event_name?: string;
  uploader_name?: string;
  is_personal: boolean;
  ai_labels?: string[];
  ai_description?: string;
}

export interface SearchInterpretation {
  original_query: string;
  keywords: string[];
  date_start?: string;
  date_end?: string;
  used_ai: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  interpretation?: SearchInterpretation;
}

export async function searchPhotos(
  token: string,
  query: string,
  limit: number = 50
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  const response = await fetch(`${API_URL}/feed/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to search photos");
  }

  return response.json();
}
