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

import { Plugins } from '@capacitor/core';

const { SharedAuthPlugin } = Plugins;

export const SharedAuthBridge = {
  /**
   * Save the JWT token to shared storage (App Groups)
   * This makes the token available to the Share Extension
   */
  async saveToken(token: string): Promise<void> {
    try {
      await SharedAuthPlugin.saveToken({ token });
      console.log('Token saved to shared storage');
    } catch (error) {
      console.error('Failed to save token to shared storage:', error);
    }
  },

  /**
   * Clear the JWT token from shared storage
   * Call this on logout
   */
  async clearToken(): Promise<void> {
    try {
      await SharedAuthPlugin.clearToken();
      console.log('Token cleared from shared storage');
    } catch (error) {
      console.error('Failed to clear token from shared storage:', error);
    }
  },

  /**
   * Get the current token from shared storage
   * Useful for debugging
   */
  async getToken(): Promise<string | null> {
    try {
      const result = await SharedAuthPlugin.getToken();
      return result.token || null;
    } catch (error) {
      console.error('Failed to get token from shared storage:', error);
      return null;
    }
  }
};

/**
 * Example integration in your auth context/store:
 * 
 * // After login
 * const handleLogin = async (credentials) => {
 *   const response = await api.post('/auth/login', credentials);
 *   const token = response.data.token;
 *   
 *   // Save to localStorage (for WebView)
 *   localStorage.setItem('token', token);
 *   
 *   // Save to App Groups (for Share Extension)
 *   await SharedAuthBridge.saveToken(token);
 * };
 * 
 * // On logout
 * const handleLogout = async () => {
 *   localStorage.removeItem('token');
 *   await SharedAuthBridge.clearToken();
 * };
 */
