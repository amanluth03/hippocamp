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

