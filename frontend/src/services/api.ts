const API_URL = "http://localhost:8000";

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

