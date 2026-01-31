import Foundation
import ScreenCaptureKit
import CoreGraphics
import AppKit

/// Window information for capture selection
struct WindowInfo {
    let windowID: CGWindowID
    let title: String
    let ownerName: String
    let frame: CGRect
    let backingScaleFactor: CGFloat
}

/// Display information for capture selection
struct DisplayInfo {
    let displayID: CGDirectDisplayID
    let name: String
    let width: Int
    let height: Int
    let backingScaleFactor: CGFloat
    let isMain: Bool
}

/// Enumerates windows and displays available for capture
@available(macOS 12.3, *)
class WindowEnumerator {

    /// List all capturable windows using ScreenCaptureKit
    static func listWindows() async throws -> [WindowInfo] {
        print("WindowEnumerator: Fetching shareable content...")

        let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)

        print("WindowEnumerator: Raw content has \(content.windows.count) windows, \(content.displays.count) displays, \(content.applications.count) apps")

        var windows: [WindowInfo] = []
        var skippedNoTitle = 0
        var skippedNoApp = 0
        var skippedSystem = 0

        for window in content.windows {
            // Skip windows without titles or from system processes
            guard let title = window.title, !title.isEmpty else {
                skippedNoTitle += 1
                continue
            }
            guard let app = window.owningApplication else {
                skippedNoApp += 1
                continue
            }

            // Skip Dock, SystemUIServer, and other system UI elements
            let bundleID = app.bundleIdentifier ?? ""
            if bundleID == "com.apple.dock" ||
               bundleID == "com.apple.SystemUIServer" ||
               bundleID == "com.apple.WindowManager" {
                skippedSystem += 1
                continue
            }

            // Get backing scale factor from the screen containing this window
            let backingScale = getBackingScaleFactor(for: window.frame)

            windows.append(WindowInfo(
                windowID: window.windowID,
                title: title,
                ownerName: app.applicationName,
                frame: window.frame,
                backingScaleFactor: backingScale
            ))
        }

        print("WindowEnumerator: Returning \(windows.count) windows (skipped: \(skippedNoTitle) no title, \(skippedNoApp) no app, \(skippedSystem) system)")

        return windows
    }

    /// List all displays using ScreenCaptureKit
    static func listDisplays() async throws -> [DisplayInfo] {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

        var displays: [DisplayInfo] = []

        for display in content.displays {
            // Get NSScreen for this display to get the backing scale factor
            let backingScale = getBackingScaleFactor(for: display.displayID)
            let name = getDisplayName(for: display.displayID)
            let isMain = CGDisplayIsMain(display.displayID) != 0

            displays.append(DisplayInfo(
                displayID: display.displayID,
                name: name,
                width: display.width,
                height: display.height,
                backingScaleFactor: backingScale,
                isMain: isMain
            ))
        }

        return displays
    }

    // MARK: - Helpers

    /// Get the backing scale factor for a given screen region
    private static func getBackingScaleFactor(for frame: CGRect) -> CGFloat {
        // Find the screen that contains the majority of this frame
        for screen in NSScreen.screens {
            if screen.frame.intersects(frame) {
                return screen.backingScaleFactor
            }
        }
        // Default to main screen's scale factor
        return NSScreen.main?.backingScaleFactor ?? 2.0
    }

    /// Get the backing scale factor for a specific display
    private static func getBackingScaleFactor(for displayID: CGDirectDisplayID) -> CGFloat {
        for screen in NSScreen.screens {
            let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
            if screenNumber == displayID {
                return screen.backingScaleFactor
            }
        }
        // Default to 2.0 for Retina
        return 2.0
    }

    /// Get a human-readable name for a display
    private static func getDisplayName(for displayID: CGDirectDisplayID) -> String {
        // Try to get the localized name from NSScreen
        for screen in NSScreen.screens {
            let screenNumber = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
            if screenNumber == displayID {
                return screen.localizedName
            }
        }

        // Fallback: use display info from CoreGraphics
        let isBuiltIn = CGDisplayIsBuiltin(displayID) != 0
        let isMain = CGDisplayIsMain(displayID) != 0

        if isBuiltIn {
            return isMain ? "Built-in Display (Main)" : "Built-in Display"
        } else {
            return isMain ? "External Display (Main)" : "External Display"
        }
    }
}
