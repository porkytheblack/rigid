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

@_cdecl("rigid_capture_create")
public func rigidCaptureCreate() -> UnsafeMutableRawPointer? {
    guard #available(macOS 12.3, *) else {
        return nil
    }
    let engine = CaptureEngine()
    return Unmanaged.passRetained(engine).toOpaque()
}

@_cdecl("rigid_capture_destroy")
public func rigidCaptureDestroy(_ handle: UnsafeMutableRawPointer?) {
    guard let handle = handle else { return }
    guard #available(macOS 12.3, *) else { return }
    Unmanaged<CaptureEngine>.fromOpaque(handle).release()
}

// MARK: Authorization

@_cdecl("rigid_capture_check_permission")
public func rigidCaptureCheckPermission() -> Bool {
    return CGPreflightScreenCaptureAccess()
}

@_cdecl("rigid_capture_request_permission")
public func rigidCaptureRequestPermission() {
    CGRequestScreenCaptureAccess()
}

// MARK: Window/Display Enumeration

// Returns JSON string containing window list, caller must free with rigid_free_string
@_cdecl("rigid_capture_list_windows_json")
public func rigidCaptureListWindowsJson() -> UnsafeMutablePointer<CChar>? {
    guard #available(macOS 12.3, *) else {
        print("RigidCaptureKit: macOS 12.3+ required for window listing")
        return strdup("[]")
    }

    // Check if we have screen capture permission
    let hasPermission = CGPreflightScreenCaptureAccess()
    print("RigidCaptureKit: Screen capture permission: \(hasPermission)")

    if !hasPermission {
        // Try to request permission (will open system dialog on first request)
        print("RigidCaptureKit: Requesting screen capture permission...")
        CGRequestScreenCaptureAccess()
    }

    var result: String = "[]"
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            print("RigidCaptureKit: Fetching shareable content...")
            let windows = try await WindowEnumerator.listWindows()
            print("RigidCaptureKit: Found \(windows.count) windows")

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
            print("RigidCaptureKit: Error listing windows: \(error)")
            result = "[]"
        }
        semaphore.signal()
    }

    // Wait with a timeout to avoid deadlocks
    let timeout = semaphore.wait(timeout: .now() + 5.0)
    if timeout == .timedOut {
        print("RigidCaptureKit: Timeout waiting for window list")
        return strdup("[]")
    }

    return strdup(result)
}

// Returns JSON string containing display list, caller must free with rigid_free_string
@_cdecl("rigid_capture_list_displays_json")
public func rigidCaptureListDisplaysJson() -> UnsafeMutablePointer<CChar>? {
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

@_cdecl("rigid_free_string")
public func rigidFreeString(_ str: UnsafeMutablePointer<CChar>?) {
    free(str)
}

// MARK: Recording - Window
// Parameters passed individually to avoid struct FFI issues

@_cdecl("rigid_capture_start_window_recording")
public func rigidCaptureStartWindowRecording(
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
        return 2 // RIGID_ERROR_INVALID_CONFIG
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
                result = 7 // RIGID_ERROR_WINDOW_NOT_FOUND
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
            result = 3 // RIGID_ERROR_RECORDING_FAILED
        }
        semaphore.signal()
    }

    semaphore.wait()
    return result
}

// MARK: Recording - Display

@_cdecl("rigid_capture_start_display_recording")
public func rigidCaptureStartDisplayRecording(
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
                result = 8 // RIGID_ERROR_DISPLAY_NOT_FOUND
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

@_cdecl("rigid_capture_start_region_recording")
public func rigidCaptureStartRegionRecording(
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

@_cdecl("rigid_capture_stop_recording")
public func rigidCaptureStopRecording(_ handle: UnsafeMutableRawPointer?) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 5 // RIGID_ERROR_NO_RECORDING
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

@_cdecl("rigid_capture_cancel_recording")
public func rigidCaptureCancelRecording(_ handle: UnsafeMutableRawPointer?) -> Int32 {
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

@_cdecl("rigid_capture_is_recording")
public func rigidCaptureIsRecording(_ handle: UnsafeMutableRawPointer?) -> Bool {
    guard #available(macOS 12.3, *) else {
        return false
    }

    guard let handle = handle else {
        return false
    }

    let engine = Unmanaged<CaptureEngine>.fromOpaque(handle).takeUnretainedValue()
    return engine.isRecording
}

@_cdecl("rigid_capture_get_recording_duration_ms")
public func rigidCaptureGetRecordingDurationMs(_ handle: UnsafeMutableRawPointer?) -> Int64 {
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

@_cdecl("rigid_capture_screenshot_window")
public func rigidCaptureScreenshotWindow(
    _ windowId: UInt32,
    _ outputPath: UnsafePointer<CChar>?,
    _ scaleFactor: Float,
    _ captureCursor: Bool
) -> Int32 {
    guard #available(macOS 12.3, *) else {
        return 6 // RIGID_ERROR_SCREENSHOT_FAILED
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

@_cdecl("rigid_capture_screenshot_display")
public func rigidCaptureScreenshotDisplay(
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

@_cdecl("rigid_capture_screenshot_region")
public func rigidCaptureScreenshotRegion(
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

// MARK: - Webcam Recording

// Global webcam recorder instance (separate from screen capture)
private var globalWebcamRecorder: WebcamRecorder?
private let webcamLock = NSLock()

/// List available audio devices for webcam recording
/// Returns JSON array: [{"index": "0", "name": "MacBook Pro Microphone"}, ...]
@_cdecl("rigid_webcam_list_audio_devices_json")
public func rigidWebcamListAudioDevicesJson() -> UnsafeMutablePointer<CChar>? {
    let devices = listWebcamAudioDevices()

    var jsonArray: [[String: Any]] = []

    // Add "No Audio" option first
    jsonArray.append([
        "index": "none",
        "name": "No Audio"
    ])

    for device in devices {
        jsonArray.append([
            "index": String(device.index),
            "name": device.name
        ])
    }

    if let jsonData = try? JSONSerialization.data(withJSONObject: jsonArray),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        return strdup(jsonString)
    }

    return strdup("[]")
}

/// List available video devices (cameras) for webcam recording
/// Returns JSON array: [{"index": "0", "name": "FaceTime HD Camera"}, ...]
@_cdecl("rigid_webcam_list_video_devices_json")
public func rigidWebcamListVideoDevicesJson() -> UnsafeMutablePointer<CChar>? {
    let devices = listWebcamVideoDevices()

    var jsonArray: [[String: Any]] = []

    for device in devices {
        jsonArray.append([
            "index": String(device.index),
            "name": device.name
        ])
    }

    if let jsonData = try? JSONSerialization.data(withJSONObject: jsonArray),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        return strdup(jsonString)
    }

    return strdup("[]")
}

/// Start webcam recording
/// audioDeviceIndex: "none" for no audio, "0", "1", etc. for specific device
/// videoDeviceIndex: nil for default camera, "0", "1", etc. for specific camera
@_cdecl("rigid_webcam_start_recording")
public func rigidWebcamStartRecording(
    _ outputPath: UnsafePointer<CChar>?,
    _ width: UInt32,
    _ height: UInt32,
    _ fps: UInt32,
    _ bitrate: UInt32,
    _ audioDeviceIndex: UnsafePointer<CChar>?,
    _ videoDeviceIndex: UnsafePointer<CChar>?
) -> Int32 {
    guard let outputPath = outputPath else {
        return 2 // Invalid config
    }

    webcamLock.lock()
    defer { webcamLock.unlock() }

    if globalWebcamRecorder != nil {
        return 1 // Already recording
    }

    let pathString = String(cString: outputPath)
    let outputURL = URL(fileURLWithPath: pathString)

    var audioDeviceID: String? = nil
    if let audioDeviceIndex = audioDeviceIndex {
        audioDeviceID = String(cString: audioDeviceIndex)
    }

    var videoDeviceID: String? = nil
    if let videoDeviceIndex = videoDeviceIndex {
        videoDeviceID = String(cString: videoDeviceIndex)
    }

    let captureAudio = audioDeviceID != "none"

    let config = WebcamRecordingConfiguration(
        width: Int(width > 0 ? width : 1280),
        height: Int(height > 0 ? height : 720),
        fps: Int(fps > 0 ? fps : 30),
        bitrate: Int(bitrate > 0 ? bitrate : 4_000_000),
        captureAudio: captureAudio,
        audioDeviceID: audioDeviceID,
        videoDeviceID: videoDeviceID
    )

    let recorder = WebcamRecorder(outputPath: outputURL, configuration: config)

    do {
        try recorder.start()
        globalWebcamRecorder = recorder
        return 0 // Success
    } catch {
        print("WebcamRecorder: Failed to start: \(error)")
        return 3 // Recording failed
    }
}

/// Stop webcam recording
@_cdecl("rigid_webcam_stop_recording")
public func rigidWebcamStopRecording() -> Int32 {
    webcamLock.lock()
    defer { webcamLock.unlock() }

    guard let recorder = globalWebcamRecorder else {
        return 5 // Not recording
    }

    do {
        try recorder.stop()
        globalWebcamRecorder = nil
        return 0 // Success
    } catch {
        print("WebcamRecorder: Failed to stop: \(error)")
        globalWebcamRecorder = nil
        return 3 // Failed
    }
}

/// Cancel webcam recording (deletes partial file)
@_cdecl("rigid_webcam_cancel_recording")
public func rigidWebcamCancelRecording() -> Int32 {
    webcamLock.lock()
    defer { webcamLock.unlock() }

    guard let recorder = globalWebcamRecorder else {
        return 5 // Not recording
    }

    recorder.cancel()
    globalWebcamRecorder = nil
    return 0
}

/// Check if webcam is currently recording
@_cdecl("rigid_webcam_is_recording")
public func rigidWebcamIsRecording() -> Bool {
    webcamLock.lock()
    defer { webcamLock.unlock() }
    return globalWebcamRecorder?.isRecording ?? false
}

/// Get webcam recording duration in milliseconds
@_cdecl("rigid_webcam_get_recording_duration_ms")
public func rigidWebcamGetRecordingDurationMs() -> Int64 {
    webcamLock.lock()
    defer { webcamLock.unlock() }
    return globalWebcamRecorder?.recordingDurationMs ?? 0
}

/// Check camera permission status
/// Returns: 0 = notDetermined, 1 = restricted, 2 = denied, 3 = authorized
@_cdecl("rigid_check_camera_permission")
public func rigidCheckCameraPermission() -> Int32 {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    return Int32(status.rawValue)
}

/// Request camera permission
/// Triggers the system permission dialog if not yet determined
/// Returns immediately - check permission status after to see result
@_cdecl("rigid_request_camera_permission")
public func rigidRequestCameraPermission() {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    print("RigidCaptureKit: Camera permission status before request: \(status.rawValue)")

    if status == .notDetermined {
        print("RigidCaptureKit: Requesting camera permission...")
        AVCaptureDevice.requestAccess(for: .video) { granted in
            print("RigidCaptureKit: Camera permission request result: \(granted)")
        }
    } else {
        print("RigidCaptureKit: Camera permission already determined: \(status.rawValue)")
    }
}

/// Check microphone permission status
/// Returns: 0 = notDetermined, 1 = restricted, 2 = denied, 3 = authorized
@_cdecl("rigid_check_microphone_permission")
public func rigidCheckMicrophonePermission() -> Int32 {
    let status = AVCaptureDevice.authorizationStatus(for: .audio)
    return Int32(status.rawValue)
}

/// Request microphone permission
@_cdecl("rigid_request_microphone_permission")
public func rigidRequestMicrophonePermission() {
    let status = AVCaptureDevice.authorizationStatus(for: .audio)
    print("RigidCaptureKit: Microphone permission status before request: \(status.rawValue)")

    if status == .notDetermined {
        print("RigidCaptureKit: Requesting microphone permission...")
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            print("RigidCaptureKit: Microphone permission request result: \(granted)")
        }
    } else {
        print("RigidCaptureKit: Microphone permission already determined: \(status.rawValue)")
    }
}

// MARK: - Helpers

private func videoCodecFromC(_ codec: Int32) -> RecordingConfiguration.VideoCodec {
    switch codec {
    case 0: // RIGID_CODEC_H264
        return .h264
    case 1: // RIGID_CODEC_HEVC
        return .hevc
    case 2: // RIGID_CODEC_PRORES_422
        return .proRes422
    case 3: // RIGID_CODEC_PRORES_422_HQ
        return .proRes422HQ
    default:
        return .hevc
    }
}
