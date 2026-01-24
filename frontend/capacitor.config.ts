import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.thehippocampus.app',
  appName: 'Hippo Campus',
  webDir: 'dist',
  
  // Server configuration - use production API
  server: {
    // Allow loading from your domain
    allowNavigation: ['thehippocampus.net', '*.thehippocampus.net'],
  },
  
  ios: {
    // Use WKWebView (modern, recommended)
    contentInset: 'automatic',
    // Allow inline media playback
    allowsLinkPreview: true,
    // Status bar style
    preferredContentMode: 'mobile',
  },
};

export default config;
