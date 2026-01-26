//
//  SharedStorage.swift
//  Shared between main app and Share Extension
//
//  Manages shared data using App Groups
//

import Foundation

class SharedStorage {
    static let shared = SharedStorage()
    
    private let appGroupIdentifier = "group.net.thehippocampus.app"
    private let authTokenKey = "hippocampus.auth.token"
    
    private var userDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
    
    private init() {}
    
    // MARK: - Auth Token
    func saveAuthToken(_ token: String) {
        userDefaults?.set(token, forKey: authTokenKey)
        userDefaults?.synchronize()
    }
    
    func getAuthToken() -> String? {
        return userDefaults?.string(forKey: authTokenKey)
    }
    
    func clearAuthToken() {
        userDefaults?.removeObject(forKey: authTokenKey)
        userDefaults?.synchronize()
    }
}
