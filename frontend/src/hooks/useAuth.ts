import { useState, useEffect } from "react";
import { User, getCurrentUser } from "../services/api";

const TOKEN_KEY = "hippocamp_token";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  useEffect(() => {
    async function loadUser() {
      console.log("useAuth.loadUser: starting, token exists:", !!token);
      if (!token) {
        console.log("useAuth.loadUser: no token, setting loading false");
        setLoading(false);
        return;
      }

      try {
        console.log("useAuth.loadUser: calling getCurrentUser");
        const userData = await getCurrentUser(token);
        console.log("useAuth.loadUser: got user data:", userData?.email);
        setUser(userData);
      } catch (error) {
        // Token is invalid, clear it
        console.error("useAuth.loadUser: ERROR - clearing token:", error);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = (newToken: string) => {
    console.log("useAuth.login: saving token to localStorage");
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      console.log("useAuth.login: localStorage.setItem succeeded");
    } catch (e) {
      console.error("useAuth.login: localStorage.setItem FAILED", e);
    }
    setToken(newToken);
    console.log("useAuth.login: state updated");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return { user, loading, token, login, logout, isAuthenticated: !!user };
}

