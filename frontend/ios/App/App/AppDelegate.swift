import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Sync token from WebView to App Groups for Share Extension
        syncTokenFromWebView()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    // MARK: - Token Sync for Share Extension
    
    private func syncTokenFromWebView() {
        print("AppDelegate: syncTokenFromWebView called")
        
        // Delay to ensure WebView is loaded, then inject script to send token
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.injectTokenSyncScript()
        }
    }
    
    private func injectTokenSyncScript() {
        guard let rootVC = window?.rootViewController else {
            print("AppDelegate: No rootViewController")
            return
        }
        
        if let webView = findWebView(in: rootVC.view) {
            print("AppDelegate: Injecting token sync script...")
            
            // JavaScript that reads token and posts it to native
            let js = """
            (function() {
                var token = localStorage.getItem('hippocamp_token');
                if (token) {
                    window.webkit.messageHandlers.tokenSync.postMessage(token);
                }
            })();
            """
            
            // Add message handler first
            webView.configuration.userContentController.removeScriptMessageHandler(forName: "tokenSync")
            webView.configuration.userContentController.add(TokenSyncHandler(), name: "tokenSync")
            
            // Execute the script
            webView.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("AppDelegate: Script error: \(error)")
                }
            }
        } else {
            print("AppDelegate: WebView not found")
        }
    }
    
    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView {
            return webView
        }
        for subview in view.subviews {
            if let found = findWebView(in: subview) {
                return found
            }
        }
        return nil
    }
}

// Message handler to receive token from JavaScript
class TokenSyncHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let token = message.body as? String {
            SharedStorage.shared.saveAuthToken(token)
            print("TokenSyncHandler: ✅ Token received and saved to App Groups!")
        }
    }
}
