import Foundation
import Capacitor
import AuthenticationServices

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]
    
    private var call: CAPPluginCall?
    
    @objc func authorize(_ call: CAPPluginCall) {
        self.call = call
        
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.email, .fullName]
        
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }
    
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? UIWindow()
    }
    
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            call?.reject("Invalid credential type")
            return
        }
        
        guard let identityTokenData = appleIDCredential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            call?.reject("Missing identity token")
            return
        }
        
        var result: [String: Any] = [
            "identityToken": identityToken,
            "user": appleIDCredential.user
        ]
        
        if let email = appleIDCredential.email {
            result["email"] = email
        }
        if let givenName = appleIDCredential.fullName?.givenName {
            result["givenName"] = givenName
        }
        if let familyName = appleIDCredential.fullName?.familyName {
            result["familyName"] = familyName
        }
        
        call?.resolve(result)
    }
    
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        call?.reject("Apple Sign In failed: \(error.localizedDescription)")
    }
}
