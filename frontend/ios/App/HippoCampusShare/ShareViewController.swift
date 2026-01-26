//
//  ShareViewController.swift
//  HippoCampusShare
//
//  Share Extension for Hippo Campus
//

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    // MARK: - UI Components
    private let containerView = UIView()
    private let titleLabel = UILabel()
    private let memoryButton = UIButton(type: .system)
    private let eventButton = UIButton(type: .system)
    private let eventListStack = UIStackView()
    private let cancelButton = UIButton(type: .system)
    private let activityIndicator = UIActivityIndicatorView(style: .medium)
    private let statusLabel = UILabel()
    
    // MARK: - Properties
    private var imageData: Data?
    private var fileName: String = "photo.jpg"
    private var events: [(id: String, name: String)] = []
    private var selectedEventIndex: Int = 0
    private var isShowingEventList = false
    private var eventListHeightConstraint: NSLayoutConstraint?
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractSharedImage()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Full screen white background
        view.backgroundColor = .systemBackground
        
        // Container fills the screen
        containerView.backgroundColor = .systemBackground
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)
        
        // App icon/emoji
        let iconLabel = UILabel()
        iconLabel.text = "🦛"
        iconLabel.font = .systemFont(ofSize: 64)
        iconLabel.textAlignment = .center
        iconLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(iconLabel)
        
        // Title
        titleLabel.text = "Hippo Campus"
        titleLabel.font = .systemFont(ofSize: 28, weight: .bold)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(titleLabel)
        
        // Subtitle
        let subtitleLabel = UILabel()
        subtitleLabel.text = "Where do you want to save this photo?"
        subtitleLabel.font = .systemFont(ofSize: 17)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(subtitleLabel)
        
        // Memory Button - with icon
        var memoryConfig = UIButton.Configuration.filled()
        memoryConfig.title = "Save as Memory"
        memoryConfig.image = UIImage(systemName: "heart.fill")
        memoryConfig.imagePadding = 8
        memoryConfig.baseBackgroundColor = UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1) // Purple
        memoryConfig.baseForegroundColor = .white
        memoryConfig.cornerStyle = .large
        memoryButton.configuration = memoryConfig
        memoryButton.addTarget(self, action: #selector(saveAsMemoryTapped), for: .touchUpInside)
        memoryButton.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(memoryButton)
        
        // Event Button - with icon
        var eventConfig = UIButton.Configuration.filled()
        eventConfig.title = "Add to Event"
        eventConfig.image = UIImage(systemName: "calendar")
        eventConfig.imagePadding = 8
        eventConfig.baseBackgroundColor = UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1) // Blue
        eventConfig.baseForegroundColor = .white
        eventConfig.cornerStyle = .large
        eventButton.configuration = eventConfig
        eventButton.addTarget(self, action: #selector(addToEventTapped), for: .touchUpInside)
        eventButton.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(eventButton)
        
        // Event List Stack - for dropdown
        eventListStack.axis = .vertical
        eventListStack.spacing = 2
        eventListStack.backgroundColor = UIColor.secondarySystemBackground
        eventListStack.layer.cornerRadius = 12
        eventListStack.clipsToBounds = true
        eventListStack.isHidden = true
        eventListStack.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(eventListStack)
        
        // Cancel Button - subtle
        var cancelConfig = UIButton.Configuration.plain()
        cancelConfig.title = "Cancel"
        cancelConfig.baseForegroundColor = .secondaryLabel
        cancelButton.configuration = cancelConfig
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(cancelButton)
        
        // Activity Indicator - larger
        activityIndicator.style = .medium
        activityIndicator.hidesWhenStopped = true
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(activityIndicator)
        
        // Status Label
        statusLabel.textAlignment = .center
        statusLabel.font = .systemFont(ofSize: 14, weight: .medium)
        statusLabel.textColor = .secondaryLabel
        statusLabel.numberOfLines = 0
        statusLabel.isHidden = true
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(statusLabel)
        
        // Event list height constraint (starts at 0)
        eventListHeightConstraint = eventListStack.heightAnchor.constraint(equalToConstant: 0)
        
        // Constraints - full screen layout
        NSLayoutConstraint.activate([
            // Container fills the entire view
            containerView.topAnchor.constraint(equalTo: view.topAnchor),
            containerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Icon at top with safe area padding
            iconLabel.topAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.topAnchor, constant: 40),
            iconLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            
            titleLabel.topAnchor.constraint(equalTo: iconLabel.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),
            
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            subtitleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),
            
            memoryButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 40),
            memoryButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            memoryButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),
            memoryButton.heightAnchor.constraint(equalToConstant: 56),
            
            eventButton.topAnchor.constraint(equalTo: memoryButton.bottomAnchor, constant: 16),
            eventButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            eventButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),
            eventButton.heightAnchor.constraint(equalToConstant: 56),
            
            // Event list appears below event button
            eventListStack.topAnchor.constraint(equalTo: eventButton.bottomAnchor, constant: 12),
            eventListStack.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            eventListStack.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),
            eventListHeightConstraint!,
            
            // Status and activity indicator below event list
            statusLabel.topAnchor.constraint(equalTo: eventListStack.bottomAnchor, constant: 16),
            statusLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 24),
            statusLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -24),
            
            activityIndicator.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            activityIndicator.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 12),
            
            // Cancel at the bottom
            cancelButton.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            cancelButton.bottomAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.bottomAnchor, constant: -24)
        ])
    }
    
    // MARK: - Extract Shared Content
    private func extractSharedImage() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let itemProvider = extensionItem.attachments?.first else {
            showError("No image found")
            return
        }
        
        // Try to load image
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (item, error) in
                if let error = error {
                    self?.showError("Error loading image: \(error.localizedDescription)")
                    return
                }
                
                var imageToProcess: UIImage?
                
                if let url = item as? URL {
                    imageToProcess = UIImage(contentsOfFile: url.path)
                    self?.fileName = url.lastPathComponent
                } else if let image = item as? UIImage {
                    imageToProcess = image
                } else if let data = item as? Data {
                    imageToProcess = UIImage(data: data)
                }
                
                if let image = imageToProcess {
                    self?.processImage(image)
                } else {
                    self?.showError("Could not process image")
                }
            }
        } else {
            showError("Item is not an image")
        }
    }
    
    private func processImage(_ image: UIImage) {
        // Convert to JPEG data
        guard let data = image.jpegData(compressionQuality: 0.8) else {
            showError("Could not convert image")
            return
        }
        
        self.imageData = data
        
        // Fetch events for the picker
        fetchEvents()
    }
    
    // MARK: - Actions
    @objc private func saveAsMemoryTapped() {
        guard let imageData = imageData else {
            showError("No image data available")
            return
        }
        
        setLoading(true, message: "Creating memory...")
        
        HippoCampusAPI.shared.uploadMemory(imageData: imageData, fileName: fileName) { [weak self] result in
            DispatchQueue.main.async {
                self?.setLoading(false)
                switch result {
                case .success:
                    self?.completeRequest()
                case .failure(let error):
                    self?.showError("Failed to upload: \(error.localizedDescription)")
                }
            }
        }
    }
    
    @objc private func addToEventTapped() {
        if events.isEmpty {
            showError("No events available. Create an event in the app first.")
            return
        }
        
        if isShowingEventList {
            // Hide the list
            hideEventList()
        } else {
            // Show the dropdown list
            showEventList()
        }
    }
    
    private func showEventList() {
        isShowingEventList = true
        eventListStack.isHidden = false
        
        // Clear existing buttons
        eventListStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        
        // Add event buttons
        for (index, event) in events.enumerated() {
            let button = UIButton(type: .system)
            var config = UIButton.Configuration.plain()
            config.title = event.name
            config.baseForegroundColor = .label
            config.contentInsets = NSDirectionalEdgeInsets(top: 14, leading: 16, bottom: 14, trailing: 16)
            button.configuration = config
            button.contentHorizontalAlignment = .leading
            button.backgroundColor = index == selectedEventIndex ? UIColor.systemBlue.withAlphaComponent(0.1) : .clear
            button.tag = index
            button.addTarget(self, action: #selector(eventSelected(_:)), for: .touchUpInside)
            eventListStack.addArrangedSubview(button)
        }
        
        // Update button to show it's expanded
        var expandedConfig = UIButton.Configuration.filled()
        expandedConfig.title = "Select Event"
        expandedConfig.image = UIImage(systemName: "chevron.up")
        expandedConfig.imagePlacement = .trailing
        expandedConfig.imagePadding = 8
        expandedConfig.baseBackgroundColor = UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1)
        expandedConfig.baseForegroundColor = .white
        expandedConfig.cornerStyle = .large
        eventButton.configuration = expandedConfig
        
        // Calculate height (max 6 visible)
        let itemHeight: CGFloat = 50
        let maxHeight = min(CGFloat(events.count), 6) * itemHeight
        eventListHeightConstraint?.constant = maxHeight
        
        UIView.animate(withDuration: 0.25, delay: 0, options: .curveEaseOut) {
            self.view.layoutIfNeeded()
        }
    }
    
    private func hideEventList() {
        isShowingEventList = false
        
        // Collapse
        eventListHeightConstraint?.constant = 0
        
        // Reset button
        var eventConfig = UIButton.Configuration.filled()
        eventConfig.title = "Add to Event"
        eventConfig.image = UIImage(systemName: "calendar")
        eventConfig.imagePadding = 8
        eventConfig.baseBackgroundColor = UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1)
        eventConfig.baseForegroundColor = .white
        eventConfig.cornerStyle = .large
        eventButton.configuration = eventConfig
        
        UIView.animate(withDuration: 0.2, delay: 0, options: .curveEaseIn) {
            self.view.layoutIfNeeded()
        } completion: { _ in
            self.eventListStack.isHidden = true
        }
    }
    
    @objc private func eventSelected(_ sender: UIButton) {
        let index = sender.tag
        selectedEventIndex = index
        
        guard let imageData = imageData else {
            showError("No image data available")
            return
        }
        
        // Hide the list and start upload
        hideEventList()
        
        let eventId = events[index].id
        let eventName = events[index].name
        setLoading(true, message: "Adding to \(eventName)...")
        
        HippoCampusAPI.shared.uploadPhotoToEvent(eventId: eventId, imageData: imageData, fileName: fileName) { [weak self] result in
            DispatchQueue.main.async {
                self?.setLoading(false)
                switch result {
                case .success:
                    self?.completeRequest()
                case .failure(let error):
                    self?.showError("Failed: \(error.localizedDescription)")
                }
            }
        }
    }
    
    @objc private func cancelTapped() {
        extensionContext?.cancelRequest(withError: NSError(domain: "HippoCampusShare", code: 0, userInfo: [NSLocalizedDescriptionKey: "User cancelled"]))
    }
    
    
    // MARK: - Fetch Events
    private func fetchEvents() {
        HippoCampusAPI.shared.fetchEvents { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let events):
                    self?.events = events
                    if events.isEmpty {
                        // Dim the event button if no events
                        var config = self?.eventButton.configuration
                        config?.baseBackgroundColor = UIColor.systemGray3
                        self?.eventButton.configuration = config
                    }
                case .failure:
                    // Silent fail - user can still create memories
                    var config = self?.eventButton.configuration
                    config?.baseBackgroundColor = UIColor.systemGray3
                    self?.eventButton.configuration = config
                }
            }
        }
    }
    
    // MARK: - UI Helpers
    private func setLoading(_ loading: Bool, message: String = "") {
        memoryButton.isEnabled = !loading
        eventButton.isEnabled = !loading
        cancelButton.isEnabled = !loading
        
        if loading {
            activityIndicator.startAnimating()
            statusLabel.text = message
            statusLabel.isHidden = false
        } else {
            activityIndicator.stopAnimating()
            statusLabel.isHidden = true
        }
    }
    
    private func showError(_ message: String) {
        DispatchQueue.main.async {
            self.statusLabel.text = "⚠️ " + message
            self.statusLabel.textColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 1)
            self.statusLabel.isHidden = false
            self.activityIndicator.stopAnimating()
        }
    }
    
    private func completeRequest() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}

