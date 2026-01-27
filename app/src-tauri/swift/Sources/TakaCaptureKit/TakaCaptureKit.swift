import Foundation
import ScreenCaptureKit
import CoreGraphics

// MARK: - Capture Engine

/// Main capture engine that manages recording state
@available(macOS 12.3, *)
class CaptureEngine {
    private var screenRecorder: ScreenRecorder?
    private let lock = NSLock()

    var isRecording: Bool {
        lock.lock()
        defer { lock.unlock() }
        return screenRecorder?.isRecording ?? false
    }

    var recordingDurationMs: Int64 {
        lock.lock()
        defer { lock.unlock() }
        return screenRecorder?.recordingDurationMs ?? 0
    }

    func startRecording(
        filter: SCContentFilter,
        outputPath: URL,
        config: RecordingConfiguration
    ) async throws {
        lock.lock()
        if screenRecorder != nil {
            lock.unlock()
            throw CaptureEngineError.alreadyRecording
        }

        let recorder = ScreenRecorder(
            filter: filter,
            outputPath: outputPath,
            configuration: config
        )
        screenRecorder = recorder
        lock.unlock()

        try await recorder.start()
    }

    func stopRecording() async throws {
        lock.lock()
        guard let recorder = screenRecorder else {
            lock.unlock()
            throw CaptureEngineError.notRecording
        }
        lock.unlock()

        try await recorder.stop()

        lock.lock()
        screenRecorder = nil
        lock.unlock()
    }

    func cancelRecording() {
        lock.lock()
        screenRecorder?.cancel()
        screenRecorder = nil
        lock.unlock()
    }
}

enum CaptureEngineError: Error {
    case alreadyRecording
    case notRecording
}

// MARK: - C API Implementation

// MARK: Lifecycle

@_cdecl("taka_capture_create")
public func takaCaptureCreate() -> UnsafeMutableRawPointer? {
    guard #available(macOS 12.3, *) else {
        return nil
    }
    let engine = CaptureEngine()
    return Unmanaged.passRetained(engine).toOpaque()
}

@_cdecl("taka_capture_destroy")
public func takaCaptureDestroy(_ handle: UnsafeMutableRawPointer?) {
    guard let handle = handle else { return }
    guard #available(macOS 12.3, *) else { return }
    Unmanaged<CaptureEngine>.fromOpaque(handle).release()
}

// MARK: Authorization

@_cdecl("taka_capture_check_permission")
public func takaCaptureCheckPermission() -> Bool {
    return CGPreflightScreenCaptureAccess()
}

@_cdecl("taka_capture_request_permission")
public func takaCaptureRequestPermission() {
    CGRequestScreenCaptureAccess()
}

// MARK: Window/Display Enumeration

// Returns JSON string containing window list, caller must free with taka_free_string
@_cdecl("taka_capture_list_windows_json")
public func takaCaptureListWindowsJson() -> UnsafeMutablePointer<CChar>? {
    guard #available(macOS 12.3, *) else {
        return strdup("[]")
    }

    var result: String = "[]"
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            let windows = try await WindowEnumerator.listWindows()

            var jsonArray: [[String: Any]] = []
            for window in windows {
                jsonArray.append([
                    "window_id": window.windowID,
                    "title": window.title,
                    "owner_name": window.ownerName,
                    "x": Int(window.frame.origin.x),
                    "y": Int(window.frame.origin.y),
                    "width": Int(window.frame.size.width),
                    "height": Int(window.frame.size.height),
                    "backing_scale_factor": window.backingScaleFactor
                ])
            }

            if let jsonData = try? JSONSerialization.data(withJSONObject: jsonArray),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                result = jsonString
            }
        } catch {
            result = "[]"
        }
        semaphore.signal()
    }

    semaphore.wait()
    return strdup(result)
}

// Returns JSON string containing display list, caller must free with taka_free_string
@_cdecl("taka_capture_list_displays_json")
public func takaCaptureListDisplaysJson() -> UnsafeMutablePointer<CChar>? {
    guard #available(macOS 12.3, *) else {
        return strdup("[]")
    }

    var result: String = "[]"
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            let displays = try await WindowEnumerator.listDisplays()

            var jsonArray: [[String: Any]] = []
            for display in displays {
                jsonArray.append([
                    "display_id": display.displayID,
                    "name": display.name,
                    "width": display.width,
                    "height": display.height,
                    "backing_scale_factor": display.backingScaleFactor,
                    "is_main": display.isMain
                ])
            }

            if let jsonData = try? JSONSerialization.data(withJSONObject: jsonArray),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                result = jsonString
            }
        } catch {
            result = "[]"
        }
        semaphore.signal()
    }

    semaphore.wait()
    return strdup(result)
}

@_cdecl("taka_free_string")
public func takaFreeString(_ str: UnsafeMutablePointer<CChar>?) {
    free(str)
}

// MARK: Recording - Window
// Parameters passed individually to avoid struct FFI issues

@_cdecl("taka_capture_start_window_recording")
public func takaCaptureStartWindowRecording(
    _ handle: UnsafeMutableRawPointer?,
    _ windowId: UInt32,
    _ outputPath: UnsafePointer<CChar>?,
    _ width: UInt32,
    _ height: UInt32,
    _ fps: UInt32,
    _ bitrate: UInt32,
    _ keyframeInterval: UInt32,
    _ codec: Int32,
    _ captureCursor: Bool,
    _ captureAudio: Bool,
    _ scaleFactor: Float
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 2 // TAKA_ERROR_INVALID_CONFIG
    }

    guard let handle = handle,
          let outputPath = outputPath else {
        return 2
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            // Get shareable content and find the window
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

            guard let window = content.windows.first(where: { $0.windowID == windowId }) else {
                result = 7 // TAKA_ERROR_WINDOW_NOT_FOUND
                semaphore.signal()
                return
            }

            // Create filter for this window
            let filter = SCContentFilter(desktopIndependentWindow: window)

            // Convert config
            let recordingConfig = RecordingConfiguration(
                width: Int(width > 0 ? width : UInt32(window.frame.width)),
                height: Int(height > 0 ? height : UInt32(window.frame.height)),
                fps: Int(fps > 0 ? fps : 60),
                bitrate: Int(bitrate > 0 ? bitrate : 20_000_000),
                keyframeInterval: Int(keyframeInterval > 0 ? keyframeInterval : 60),
                codec: videoCodecFromC(codec),
                captureCursor: captureCursor,
                captureAudio: captureAudio,
                scaleFactor: CGFloat(scaleFactor > 0 ? scaleFactor : 2.0)
            )

            try await engine.startRecording(
                filter: filter,
                outputPath: outputURL,
                config: recordingConfig
            )
            result = 0
        } catch {
            result = 3 // TAKA_ERROR_RECORDING_FAILED
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: Recording - Display

@_cdecl("taka_capture_start_display_recording")
public func takaCaptureStartDisplayRecording(
    _ handle: UnsafeMutableRawPointer?,
    _ displayId: UInt32,
    _ outputPath: UnsafePointer<CChar>?,
    _ width: UInt32,
    _ height: UInt32,
    _ fps: UInt32,
    _ bitrate: UInt32,
    _ keyframeInterval: UInt32,
    _ codec: Int32,
    _ captureCursor: Bool,
    _ captureAudio: Bool,
    _ scaleFactor: Float
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 2
    }

    guard let handle = handle,
          let outputPath = outputPath else {
        return 2
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

            guard let display = content.displays.first(where: { $0.displayID == displayId }) else {
                result = 8 // TAKA_ERROR_DISPLAY_NOT_FOUND
                semaphore.signal()
                return
            }

            let filter = SCContentFilter(display: display, excludingWindows: [])

            let recordingConfig = RecordingConfiguration(
                width: Int(width > 0 ? width : UInt32(display.width)),
                height: Int(height > 0 ? height : UInt32(display.height)),
                fps: Int(fps > 0 ? fps : 60),
                bitrate: Int(bitrate > 0 ? bitrate : 20_000_000),
                keyframeInterval: Int(keyframeInterval > 0 ? keyframeInterval : 60),
                codec: videoCodecFromC(codec),
                captureCursor: captureCursor,
                captureAudio: captureAudio,
                scaleFactor: CGFloat(scaleFactor > 0 ? scaleFactor : 2.0)
            )

            try await engine.startRecording(
                filter: filter,
                outputPath: outputURL,
                config: recordingConfig
            )
            result = 0
        } catch {
            result = 3
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: Recording - Region

@_cdecl("taka_capture_start_region_recording")
public func takaCaptureStartRegionRecording(
    _ handle: UnsafeMutableRawPointer?,
    _ displayId: UInt32,
    _ x: Int32,
    _ y: Int32,
    _ regionWidth: Int32,
    _ regionHeight: Int32,
    _ outputPath: UnsafePointer<CChar>?,
    _ fps: UInt32,
    _ bitrate: UInt32,
    _ keyframeInterval: UInt32,
    _ codec: Int32,
    _ captureCursor: Bool,
    _ captureAudio: Bool,
    _ scaleFactor: Float
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 2
    }

    guard let handle = handle,
          let outputPath = outputPath else {
        return 2
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)

            guard let display = content.displays.first(where: { $0.displayID == displayId }) else {
                result = 8
                semaphore.signal()
                return
            }

            // For region recording, we capture the full display
            // Note: SCStreamConfiguration supports sourceRect for cropping in macOS 14+
            let filter = SCContentFilter(display: display, excludingWindows: [])

            let recordingConfig = RecordingConfiguration(
                width: Int(regionWidth),
                height: Int(regionHeight),
                fps: Int(fps > 0 ? fps : 60),
                bitrate: Int(bitrate > 0 ? bitrate : 20_000_000),
                keyframeInterval: Int(keyframeInterval > 0 ? keyframeInterval : 60),
                codec: videoCodecFromC(codec),
                captureCursor: captureCursor,
                captureAudio: captureAudio,
                scaleFactor: CGFloat(scaleFactor > 0 ? scaleFactor : 2.0)
            )

            try await engine.startRecording(
                filter: filter,
                outputPath: outputURL,
                config: recordingConfig
            )
            result = 0
        } catch {
            result = 3
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: Recording Control

@_cdecl("taka_capture_stop_recording")
public func takaCaptureStopRecording(_ handle: UnsafeMutableRawPointer?) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 5 // TAKA_ERROR_NO_RECORDING
    }

    guard let handle = handle else {
        return 5
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            try await engine.stopRecording()
            result = 0
        } catch CaptureEngineError.notRecording {
            result = 5
        } catch {
            result = 3
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

@_cdecl("taka_capture_cancel_recording")
public func takaCaptureCancelRecording(_ handle: UnsafeMutableRawPointer?) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 5
    }

    guard let handle = handle else {
        return 5
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    engine.cancelRecording()
    return 0
}

@_cdecl("taka_capture_is_recording")
public func takaCaptureIsRecording(_ handle: UnsafeMutableRawPointer?) -> Bool {
    guard #available(macOS 12.3, *) else {
        return false
    }

    guard let handle = handle else {
        return false
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    return engine.isRecording
}

@_cdecl("taka_capture_get_recording_duration_ms")
public func takaCaptureGetRecordingDurationMs(_ handle: UnsafeMutableRawPointer?) -> Int64 {
    guard #available(macOS 12.3, *) else {
        return 0
    }

    guard let handle = handle else {
        return 0
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    return engine.recordingDurationMs
}

// MARK: Screenshot - Window

@_cdecl("taka_capture_screenshot_window")
public func takaCaptureScreenshotWindow(
    _ windowId: UInt32,
    _ outputPath: UnsafePointer<CChar>?,
    _ scaleFactor: Float,
    _ captureCursor: Bool
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 6 // TAKA_ERROR_SCREENSHOT_FAILED
    }

    guard let outputPath = outputPath else {
        return 2
    }

    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    let screenshotConfig = ScreenshotConfiguration(
        scaleFactor: CGFloat(scaleFactor > 0 ? scaleFactor : 2.0),
        captureCursor: captureCursor
    )

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            try await ScreenshotCapture.captureWindow(
                windowID: windowId,
                outputPath: outputURL,
                config: screenshotConfig
            )
            result = 0
        } catch let error as ScreenshotError {
            result = error.errorCode
        } catch {
            result = 6
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: Screenshot - Display

@_cdecl("taka_capture_screenshot_display")
public func takaCaptureScreenshotDisplay(
    _ displayId: UInt32,
    _ outputPath: UnsafePointer<CChar>?,
    _ scaleFactor: Float,
    _ captureCursor: Bool
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 6
    }

    guard let outputPath = outputPath else {
        return 2
    }

    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    let screenshotConfig = ScreenshotConfiguration(
        scaleFactor: CGFloat(scaleFactor > 0 ? scaleFactor : 2.0),
        captureCursor: captureCursor
    )

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            try await ScreenshotCapture.captureDisplay(
                displayID: displayId,
                outputPath: outputURL,
                config: screenshotConfig
            )
            result = 0
        } catch let error as ScreenshotError {
            result = error.errorCode
        } catch {
            result = 6
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: Screenshot - Region

@_cdecl("taka_capture_screenshot_region")
public func takaCaptureScreenshotRegion(
    _ displayId: UInt32,
    _ x: Int32,
    _ y: Int32,
    _ width: Int32,
    _ height: Int32,
    _ outputPath: UnsafePointer<CChar>?,
    _ scaleFactor: Float,
    _ captureCursor: Bool
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 6
    }

    guard let outputPath = outputPath else {
        return 2
    }

    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    let rect = CGRect(x: CGFloat(x), y: CGFloat(y), width: CGFloat(width), height: CGFloat(height))

    let screenshotConfig = ScreenshotConfiguration(
        scaleFactor: CGFloat(scaleFactor > 0 ? scaleFactor : 2.0),
        captureCursor: captureCursor
    )

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            try await ScreenshotCapture.captureRegion(
                displayID: displayId,
                rect: rect,
                outputPath: outputURL,
                config: screenshotConfig
            )
            result = 0
        } catch let error as ScreenshotError {
            result = error.errorCode
        } catch {
            result = 6
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: - Helpers

private func videoCodecFromC(_ codec: Int32) -> RecordingConfiguration.VideoCodec {
    switch codec {
    case 0: // TAKA_CODEC_H264
        return .h264
    case 1: // TAKA_CODEC_HEVC
        return .hevc
    case 2: // TAKA_CODEC_PRORES_422
        return .proRes422
    case 3: // TAKA_CODEC_PRORES_422_HQ
        return .proRes422HQ
    default:
        return .hevc
    }
}
