import Foundation
import ScreenCaptureKit
import CoreGraphics
import AppKit

/// Configuration for screenshot capture
struct ScreenshotConfiguration {
    let scaleFactor: CGFloat
    let captureCursor: Bool
}

/// Screenshot capture errors
enum ScreenshotError: Error {
    case windowNotFound
    case displayNotFound
    case captureFailed
    case cropFailed
    case encodingFailed
    case permissionDenied

    var errorCode: Int32 {
        switch self {
        case .windowNotFound: return 7  // RIGID_ERROR_WINDOW_NOT_FOUND
        case .displayNotFound: return 8 // RIGID_ERROR_DISPLAY_NOT_FOUND
        case .captureFailed: return 6   // RIGID_ERROR_SCREENSHOT_FAILED
        case .cropFailed: return 6
        case .encodingFailed: return 6
        case .permissionDenied: return 1 // RIGID_ERROR_NOT_AUTHORIZED
        }
    }
}

/// High-quality screenshot capture using ScreenCaptureKit
@available(macOS 12.3, *)
class ScreenshotCapture {

    /// Capture a window at native backing resolution
    static func captureWindow(
        windowID: CGWindowID,
        outputPath: URL,
        config: ScreenshotConfiguration
    ) async throws {
        // Get shareable content to find our window
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

        guard let window = content.windows.first(where: { $0.windowID == windowID }) else {
            throw ScreenshotError.windowNotFound
        }

        // Create filter for just this window
        let filter = SCContentFilter(desktopIndependentWindow: window)

        // Configure for native resolution
        let streamConfig = SCStreamConfiguration()

        // Use backing scale factor for Retina capture
        let frame = window.frame
        let pixelWidth = Int(frame.width * config.scaleFactor)
        let pixelHeight = Int(frame.height * config.scaleFactor)

        streamConfig.width = pixelWidth
        streamConfig.height = pixelHeight
        streamConfig.showsCursor = config.captureCursor
        if #available(macOS 13.0, *) {
            streamConfig.capturesAudio = false
        }
        streamConfig.pixelFormat = kCVPixelFormatType_32BGRA

        // Use SCScreenshotManager for single-frame capture (macOS 14+)
        if #available(macOS 14.0, *) {
            let image = try await SCScreenshotManager.captureImage(
                contentFilter: filter,
                configuration: streamConfig
            )
            try saveImage(image, to: outputPath)
        } else {
            // Fallback for macOS 12-13: Use CGWindowListCreateImage
            try captureWindowLegacy(windowID: windowID, outputPath: outputPath, config: config)
        }
    }

    /// Capture a display at native backing resolution
    static func captureDisplay(
        displayID: CGDirectDisplayID,
        outputPath: URL,
        config: ScreenshotConfiguration
    ) async throws {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

        guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
            throw ScreenshotError.displayNotFound
        }

        // Create filter for the display, excluding no windows
        let filter = SCContentFilter(display: display, excludingWindows: [])

        let streamConfig = SCStreamConfiguration()

        // Calculate pixel dimensions
        let pixelWidth = Int(CGFloat(display.width) * config.scaleFactor)
        let pixelHeight = Int(CGFloat(display.height) * config.scaleFactor)

        streamConfig.width = pixelWidth
        streamConfig.height = pixelHeight
        streamConfig.showsCursor = config.captureCursor
        if #available(macOS 13.0, *) {
            streamConfig.capturesAudio = false
        }
        streamConfig.pixelFormat = kCVPixelFormatType_32BGRA

        if #available(macOS 14.0, *) {
            let image = try await SCScreenshotManager.captureImage(
                contentFilter: filter,
                configuration: streamConfig
            )
            try saveImage(image, to: outputPath)
        } else {
            try captureDisplayLegacy(displayID: displayID, outputPath: outputPath, config: config)
        }
    }

    /// Capture a region of a display at native backing resolution
    static func captureRegion(
        displayID: CGDirectDisplayID,
        rect: CGRect,
        outputPath: URL,
        config: ScreenshotConfiguration
    ) async throws {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

        guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
            throw ScreenshotError.displayNotFound
        }

        let filter = SCContentFilter(display: display, excludingWindows: [])

        let streamConfig = SCStreamConfiguration()

        // Capture at full display resolution
        let fullWidth = Int(CGFloat(display.width) * config.scaleFactor)
        let fullHeight = Int(CGFloat(display.height) * config.scaleFactor)

        streamConfig.width = fullWidth
        streamConfig.height = fullHeight
        streamConfig.showsCursor = config.captureCursor
        if #available(macOS 13.0, *) {
            streamConfig.capturesAudio = false
        }
        streamConfig.pixelFormat = kCVPixelFormatType_32BGRA

        if #available(macOS 14.0, *) {
            let fullImage = try await SCScreenshotManager.captureImage(
                contentFilter: filter,
                configuration: streamConfig
            )

            // Crop to region at scaled coordinates
            let scaledRect = CGRect(
                x: rect.origin.x * config.scaleFactor,
                y: rect.origin.y * config.scaleFactor,
                width: rect.width * config.scaleFactor,
                height: rect.height * config.scaleFactor
            )

            guard let croppedImage = fullImage.cropping(to: scaledRect) else {
                throw ScreenshotError.cropFailed
            }

            try saveImage(croppedImage, to: outputPath)
        } else {
            try captureRegionLegacy(displayID: displayID, rect: rect, outputPath: outputPath, config: config)
        }
    }

    // MARK: - Legacy implementations for macOS 12-13

    private static func captureWindowLegacy(
        windowID: CGWindowID,
        outputPath: URL,
        config: ScreenshotConfiguration
    ) throws {
        // CGWindowListCreateImage options for high-quality capture
        // .nominalResolution uses the backing scale factor
        let imageOption: CGWindowImageOption = [.boundsIgnoreFraming, .nominalResolution]

        guard let cgImage = CGWindowListCreateImage(
            .null,
            .optionIncludingWindow,
            windowID,
            imageOption
        ) else {
            throw ScreenshotError.captureFailed
        }

        try saveImage(cgImage, to: outputPath)
    }

    private static func captureDisplayLegacy(
        displayID: CGDirectDisplayID,
        outputPath: URL,
        config: ScreenshotConfiguration
    ) throws {
        // CGDisplayCreateImage captures at native resolution
        guard let cgImage = CGDisplayCreateImage(displayID) else {
            throw ScreenshotError.captureFailed
        }

        try saveImage(cgImage, to: outputPath)
    }

    private static func captureRegionLegacy(
        displayID: CGDirectDisplayID,
        rect: CGRect,
        outputPath: URL,
        config: ScreenshotConfiguration
    ) throws {
        guard let fullImage = CGDisplayCreateImage(displayID) else {
            throw ScreenshotError.captureFailed
        }

        // Scale the rect to pixel coordinates
        let scaledRect = CGRect(
            x: rect.origin.x * config.scaleFactor,
            y: rect.origin.y * config.scaleFactor,
            width: rect.width * config.scaleFactor,
            height: rect.height * config.scaleFactor
        )

        guard let croppedImage = fullImage.cropping(to: scaledRect) else {
            throw ScreenshotError.cropFailed
        }

        try saveImage(croppedImage, to: outputPath)
    }

    // MARK: - Image saving

    /// Save CGImage to file as PNG
    private static func saveImage(_ cgImage: CGImage, to url: URL) throws {
        let bitmapRep = NSBitmapImageRep(cgImage: cgImage)

        // PNG with maximum quality
        let properties: [NSBitmapImageRep.PropertyKey: Any] = [:]

        guard let pngData = bitmapRep.representation(using: .png, properties: properties) else {
            throw ScreenshotError.encodingFailed
        }

        try pngData.write(to: url)
    }
}
