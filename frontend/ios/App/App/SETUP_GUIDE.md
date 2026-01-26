# Hippo Campus Share Extension - Setup Guide

## Overview
This guide will help you integrate the Share Extension into your Xcode project so users can share photos from the Photos app directly to Hippo Campus.

## Step-by-Step Setup

### 1. Create Share Extension Target in Xcode

1. Open your Xcode project (`frontend/ios/App/App.xcodeproj`)
2. Click **File > New > Target**
3. Select **Share Extension** template
4. Configure:
   - **Product Name**: `HippoCampusShare`
   - **Bundle Identifier**: `net.thehippocampus.app.share`
   - **Language**: Swift
   - Click **Finish**
5. When prompted "Activate HippoCampusShare scheme?", click **Activate**

### 2. Add Files to Share Extension Target

1. **Add to Share Extension target** (drag into HippoCampusShare group):
   - `ShareViewController.swift` (replace the generated one)
   - `HippoCampusAPI.swift`
   - `SharedStorage.swift`

2. **Add to BOTH Main App AND Share Extension** (select both targets):
   - `SharedStorage.swift` (add to both targets in File Inspector)

3. **Add to Main App only**:
   - `SharedAuthPlugin.swift`
   - `SharedAuthBridge.ts` (copy to your React project)

### 3. Configure Info.plist for Share Extension

Replace the generated `Info.plist` in the Share Extension with `ShareExtension-Info.plist`

Or manually edit to ensure it has:
```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>NSExtensionActivationRule</key>
        <dict>
            <key>NSExtensionActivationSupportsImageWithMaxCount</key>
            <integer>1</integer>
        </dict>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
    <key>NSExtensionPrincipalClass</key>
    <string>ShareViewController</string>
</dict>
```

**Note**: If Xcode generated a MainInterface.storyboard, you can either:
- Delete it and change `NSExtensionMainStoryboard` to `NSExtensionPrincipalClass` with value `ShareViewController`
- Or keep it and connect it to ShareViewController

### 4. Enable App Groups

#### For Main App:
1. Select your **main app target** (not the extension)
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **App Groups**
5. Click **+** and add: `group.net.thehippocampus.app`
6. Attach `App.entitlements` file to the target

#### For Share Extension:
1. Select **HippoCampusShare target**
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **App Groups**
5. Click **+** and add: `group.net.thehippocampus.app` (same as main app)
6. Attach `ShareExtension.entitlements` file to the target

### 5. Register Capacitor Plugin

1. Open your **main app's** `Info.plist`
2. Add the plugin registration:

```xml
<key>CapacitorPlugins</key>
<dict>
    <key>SharedAuthPlugin</key>
    <string>SharedAuthPlugin</string>
</dict>
```

Or create a `capacitor.config.json` file if you don't have one:

```json
{
  "plugins": {
    "SharedAuthPlugin": {
      "class": "SharedAuthPlugin"
    }
  }
}
```

Alternatively, register in Swift code. In your app, create or edit the file that imports Capacitor plugins. In Capacitor 4+, you typically register plugins like this:

Create `Plugins.swift` (or add to existing):

```swift
import Capacitor

@objc public class MyPlugins: NSObject {
    @objc public static func load() {
        Capacitor.registerPlugin(SharedAuthPlugin.self)
    }
}
```

Then call `MyPlugins.load()` early in app startup.

**For Capacitor 5+**, create or edit the `Podfile` to include your custom plugin if needed, or simply ensure the Swift files are compiled into the main app target.

### 6. Update Your React App

1. Copy `SharedAuthBridge.ts` to your React project (e.g., `src/utils/`)

2. Update your authentication flow:

```typescript
// In your login handler
import { SharedAuthBridge } from './utils/SharedAuthBridge';

const handleLogin = async (credentials) => {
  const response = await fetch('https://thehippocampus.net/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  
  const data = await response.json();
  const token = data.token; // Your JWT token
  
  // Save to localStorage (for WebView)
  localStorage.setItem('authToken', token);
  
  // Save to App Groups (for Share Extension)
  await SharedAuthBridge.saveToken(token);
};

// In your logout handler
const handleLogout = async () => {
  localStorage.removeItem('authToken');
  await SharedAuthBridge.clearToken();
};
```

3. Also save token on app startup if already logged in:

```typescript
// In App.tsx or similar
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (token) {
    // Sync to App Groups in case it's missing
    SharedAuthBridge.saveToken(token);
  }
}, []);
```

### 7. Build & Test

1. **Build the app**: Select your main app scheme and build for a real device (Share Extensions don't work in simulator reliably)
2. **Install on device**: Run the app on your iPhone
3. **Test the extension**:
   - Open the **Photos** app
   - Select a photo
   - Tap the **Share** button
   - Look for **Hippo Campus** in the share sheet
   - Tap it and test uploading

### 8. Troubleshooting

#### Extension doesn't appear in share sheet
- Make sure you built and ran the app on the device at least once
- Check that `NSExtensionActivationRule` in Info.plist is correct
- Reboot the device (iOS caches share extensions)

#### "Not authenticated" error
- Make sure you're logged in to the main app first
- Check that App Groups capability is enabled for BOTH targets
- Verify both are using the same App Group ID: `group.net.thehippocampus.app`
- Check that SharedStorage.swift is included in both targets

#### Upload fails
- Check your API endpoint URLs are correct in `HippoCampusAPI.swift`
- Verify the token format matches your backend expectations
- Check network connectivity
- Look at device console logs in Xcode for detailed error messages

#### Plugin not found in React
- Make sure `SharedAuthPlugin.swift` is added to the **main app target** (not extension)
- Verify the plugin is registered (see step 5)
- Rebuild the app
- Check Capacitor version compatibility

## File Structure

```
App/
├── App/                          # Main app target
│   ├── AppDelegate.swift         # Updated
│   ├── SharedAuthPlugin.swift    # NEW - Plugin for React ↔ Native
│   ├── SharedStorage.swift       # NEW - Shared between app & extension
│   └── App.entitlements         # NEW - App Groups capability
│
├── HippoCampusShare/            # Share Extension target
│   ├── ShareViewController.swift # NEW - Main extension UI & logic
│   ├── HippoCampusAPI.swift     # NEW - API client for uploads
│   ├── SharedStorage.swift      # SHARED - Reference from main app
│   ├── Info.plist               # Extension configuration
│   └── ShareExtension.entitlements # NEW - App Groups capability
│
└── React App/
    └── src/utils/
        └── SharedAuthBridge.ts   # NEW - TypeScript bridge
```

## Next Steps

1. Customize the UI in `ShareViewController.swift` to match your app's design
2. Add error handling and retry logic
3. Consider adding progress indicators for uploads
4. Add analytics to track share extension usage
5. Test with different image sizes and formats
6. Consider supporting multiple photo selection (change `NSExtensionActivationSupportsImageWithMaxCount`)

## API Endpoints Reference

The extension uses these endpoints:

- **POST** `/api/memories/upload` - Upload as new memory
  - Headers: `Authorization: Bearer <token>`
  - Body: `multipart/form-data` with `file` field

- **POST** `/api/photos/upload?event_id=<uuid>` - Add to event
  - Headers: `Authorization: Bearer <token>`
  - Body: `multipart/form-data` with `file` field

- **GET** `/api/events` - Fetch user's events (for picker)
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of `{id: string, name: string}`

Make sure these match your backend implementation!
