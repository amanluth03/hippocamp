//
//  HippoCampusAPI.swift
//  HippoCampusShare
//
//  API Client for Hippo Campus Share Extension
//

import Foundation

class HippoCampusAPI {
    static let shared = HippoCampusAPI()
    
    private let baseURL = "https://thehippocampus.net/api"
    
    private init() {}
    
    // MARK: - Authentication
    private func getAuthToken() -> String? {
        return SharedStorage.shared.getAuthToken()
    }
    
    // MARK: - Upload Memory
    func uploadMemory(imageData: Data, fileName: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let token = getAuthToken() else {
            completion(.failure(APIError.noAuthToken))
            return
        }
        
        let url = URL(string: "\(baseURL)/memories/upload")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let httpBody = createMultipartBody(boundary: boundary, imageData: imageData, fileName: fileName, fieldName: "file")
        request.httpBody = httpBody
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(APIError.invalidResponse))
                return
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorMessage = data.flatMap { String(data: $0, encoding: .utf8) } ?? "Unknown error"
                completion(.failure(APIError.httpError(statusCode: httpResponse.statusCode, message: errorMessage)))
                return
            }
            
            completion(.success(()))
        }
        
        task.resume()
    }
    
    // MARK: - Upload Photo to Event
    func uploadPhotoToEvent(eventId: String, imageData: Data, fileName: String, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let token = getAuthToken() else {
            completion(.failure(APIError.noAuthToken))
            return
        }
        
        let url = URL(string: "\(baseURL)/photos/upload")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let httpBody = createMultipartBodyWithEventId(boundary: boundary, imageData: imageData, fileName: fileName, eventId: eventId)
        request.httpBody = httpBody
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(APIError.invalidResponse))
                return
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorMessage = data.flatMap { String(data: $0, encoding: .utf8) } ?? "Unknown error"
                completion(.failure(APIError.httpError(statusCode: httpResponse.statusCode, message: errorMessage)))
                return
            }
            
            completion(.success(()))
        }
        
        task.resume()
    }
    
    // MARK: - Fetch Events
    func fetchEvents(completion: @escaping (Result<[(id: String, name: String)], Error>) -> Void) {
        guard let token = getAuthToken() else {
            completion(.failure(APIError.noAuthToken))
            return
        }
        
        let url = URL(string: "\(baseURL)/events")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(APIError.invalidResponse))
                return
            }
            
            guard (200...299).contains(httpResponse.statusCode),
                  let data = data else {
                completion(.failure(APIError.httpError(statusCode: httpResponse.statusCode, message: "Failed to fetch events")))
                return
            }
            
            do {
                // Parse events from JSON
                let json = try JSONSerialization.jsonObject(with: data, options: [])
                var events: [(id: String, name: String)] = []
                
                if let eventsArray = json as? [[String: Any]] {
                    for eventDict in eventsArray {
                        if let id = eventDict["id"] as? String,
                           let name = eventDict["name"] as? String {
                            events.append((id: id, name: name))
                        }
                    }
                }
                
                completion(.success(events))
            } catch {
                completion(.failure(error))
            }
        }
        
        task.resume()
    }
    
    // MARK: - Multipart Body Helper
    private func createMultipartBody(boundary: String, imageData: Data, fileName: String, fieldName: String) -> Data {
        var body = Data()
        
        // Add image data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        return body
    }
    
    private func createMultipartBodyWithEventId(boundary: String, imageData: Data, fileName: String, eventId: String) -> Data {
        var body = Data()
        
        // Add event_id field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"event_id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(eventId)\r\n".data(using: .utf8)!)
        
        // Add image data
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        return body
    }
}

// MARK: - API Error
enum APIError: LocalizedError {
    case noAuthToken
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    
    var errorDescription: String? {
        switch self {
        case .noAuthToken:
            return "Not authenticated. Please open Hippo Campus app first."
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let statusCode, let message):
            return "Error \(statusCode): \(message)"
        }
    }
}
