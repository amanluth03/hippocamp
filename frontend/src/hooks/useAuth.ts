import { useState, useEffect, useCallback } from "react";
import { User, getCurrentUser, getGoogleLoginUrl, isNativeApp } from "../services/api";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App, URLOpenListenerEvent } from "@capacitor/app";
import { SharedAuthBridge } from "../utils/SharedAuthBridge";

const TOKEN_KEY = "hippocamp_token";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  // Handle deep link callback from OAuth (for Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppUrlOpen = async (event: URLOpenListenerEvent) => {
      console.log("useAuth: App URL opened:", event.url);
      
      // Parse the URL to extract the token
      // Expected format: hippocampus://auth/callback?token=xxx
      const url = new URL(event.url);
      const urlToken = url.searchParams.get("token");
      
      if (urlToken) {
        console.log("useAuth: Token received from deep link");
        login(urlToken);
        // Close the browser after successful login
        await Browser.close();
      }
    };

    // Listen for app URL open events
    App.addListener("appUrlOpen", handleAppUrlOpen);

    return () => {
      App.removeAllListeners();
    };
  }, []);

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
        
        // Sync token to App Groups for Share Extension (in case it's missing)
        await SharedAuthBridge.saveToken(token);
      } catch (error) {
        // Token is invalid, clear it
        const err = error as Error;
        console.error("useAuth.loadUser: ERROR - clearing token");
        console.error("useAuth.loadUser: error name:", err.name);
        console.error("useAuth.loadUser: error message:", err.message);
        console.error("useAuth.loadUser: error stack:", err.stack);
        localStorage.removeItem(TOKEN_KEY);
        await SharedAuthBridge.clearToken();
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = useCallback(async (newToken: string) => {
    console.log("useAuth.login: saving token to localStorage");
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      console.log("useAuth.login: localStorage.setItem succeeded");
      
      // Also save to App Groups for Share Extension
      await SharedAuthBridge.saveToken(newToken);
    } catch (e) {
      console.error("useAuth.login: localStorage.setItem FAILED", e);
    }
    setToken(newToken);
    console.log("useAuth.login: state updated");
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    // Also clear from App Groups
    await SharedAuthBridge.clearToken();
    setToken(null);
    setUser(null);
  }, []);

  // Start OAuth flow - uses Browser plugin for Capacitor
  const startGoogleLogin = useCallback(async () => {
    const loginUrl = getGoogleLoginUrl();
    console.log("useAuth.startGoogleLogin: URL =", loginUrl);
    
    if (isNativeApp()) {
      // Open in external browser for Capacitor
      console.log("useAuth.startGoogleLogin: Opening in Capacitor Browser");
      await Browser.open({ url: loginUrl });
    } else {
      // Regular browser navigation
      window.location.href = loginUrl;
    }
  }, []);

  return { 
    user, 
    loading, 
    token, 
    login, 
    logout, 
    startGoogleLogin,
    isAuthenticated: !!user 
  };
}

