//
//  SharedAuthPlugin.swift
//  Capacitor Plugin to share auth token with Share Extension
//

import Foundation
import Capacitor

@objc(SharedAuthPlugin)
public class SharedAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    
    // Required for Capacitor 8
    public let identifier = "SharedAuthPlugin"
    public let jsName = "SharedAuthPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]
    
    override public func load() {
        print("SharedAuthPlugin: Plugin loaded!")
    }
    
    @objc func saveToken(_ call: CAPPluginCall) {
        print("SharedAuthPlugin: saveToken called")
        guard let token = call.getString("token") else {
            call.reject("Token is required")
            return
        }
        
        SharedStorage.shared.saveAuthToken(token)
        print("SharedAuthPlugin: Token saved to App Groups")
        call.resolve(["success": true])
    }
    
    @objc func clearToken(_ call: CAPPluginCall) {
        print("SharedAuthPlugin: clearToken called")
        SharedStorage.shared.clearAuthToken()
        print("SharedAuthPlugin: Token cleared from App Groups")
        call.resolve(["success": true])
    }
    
    @objc func getToken(_ call: CAPPluginCall) {
        print("SharedAuthPlugin: getToken called")
        if let token = SharedStorage.shared.getAuthToken() {
            print("SharedAuthPlugin: Token retrieved from App Groups")
            call.resolve(["token": token])
        } else {
            print("SharedAuthPlugin: No token found in App Groups")
            call.resolve(["token": NSNull()])
        }
    }
}
