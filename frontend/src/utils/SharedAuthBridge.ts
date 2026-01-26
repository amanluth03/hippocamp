/**
 * SharedAuthBridge.ts
 * TypeScript bridge for communicating with the SharedAuthPlugin
 * 
 * Usage in your React app:
 * 
 * import { SharedAuthBridge } from './SharedAuthBridge';
 * 
 * // After successful login, save token to share with extension
 * await SharedAuthBridge.saveToken(jwtToken);
 * 
 * // On logout
 * await SharedAuthBridge.clearToken();
 */

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

interface SharedAuthPluginInterface {
  saveToken(options: { token: string }): Promise<{ success: boolean }>;
  clearToken(): Promise<{ success: boolean }>;
  getToken(): Promise<{ token: string | null }>;
}

const SharedAuthPlugin = registerPlugin<SharedAuthPluginInterface>('SharedAuthPlugin');

export const SharedAuthBridge = {
  /**
   * Save the JWT token to shared storage (App Groups)
   * Note: Token is now synced via AppDelegate when app becomes active
   * This is kept for future use if plugin registration is fixed
   */
  async saveToken(_token: string): Promise<void> {
    // Token sync is handled by AppDelegate.syncTokenFromWebView()
    // Plugin registration doesn't work in Capacitor 8, so we skip it
    return;
  },

  /**
   * Clear the JWT token from shared storage
   * Note: Not implemented - logout clears localStorage, and next app activation will sync empty state
   */
  async clearToken(): Promise<void> {
    // Token sync is handled by AppDelegate
    return;
  },

  /**
   * Get the current token from shared storage
   * Useful for debugging
   */
  async getToken(): Promise<string | null> {
    // Only works on native iOS
    if (!Capacitor.isNativePlatform()) {
      return null;
    }
    try {
      const result = await SharedAuthPlugin.getToken();
      return result.token || null;
    } catch (error) {
      console.error('Failed to get token from shared storage:', error);
      return null;
    }
  }
};
