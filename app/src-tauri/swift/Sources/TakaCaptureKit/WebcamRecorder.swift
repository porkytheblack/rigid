import Foundation
import AVFoundation
import CoreMedia

/// Configuration for webcam recording
struct WebcamRecordingConfiguration {
    let width: Int
    let height: Int
    let fps: Int
    let bitrate: Int
    let captureAudio: Bool
    let audioDeviceID: String?  // nil means use default, "none" means no audio
    let videoDeviceID: String?  // nil means use default camera, or index/uniqueID to select specific camera

    static let `default` = WebcamRecordingConfiguration(
        width: 1280,
        height: 720,
        fps: 30,
        bitrate: 4_000_000,
        captureAudio: true,
        audioDeviceID: nil,
        videoDeviceID: nil
    )
}

/// Native webcam recorder using AVFoundation
/// This provides proper A/V sync and doesn't require ffmpeg
class WebcamRecorder: NSObject {
    private var captureSession: AVCaptureSession?
    private var assetWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var audioInput: AVAssetWriterInput?
    private var videoOutput: AVCaptureVideoDataOutput?
    private var audioOutput: AVCaptureAudioDataOutput?

    private let outputPath: URL
    private let configuration: WebcamRecordingConfiguration

    private var startTime: CMTime?
    private var _isRecording: Bool = false
    private var sessionStarted: Bool = false
    private var recordingStartDate: Date?
    private var frameCount: Int = 0

    private let videoQueue = DispatchQueue(label: "com.taka.webcam.video", qos: .userInteractive)
    private let audioQueue = DispatchQueue(label: "com.taka.webcam.audio", qos: .userInteractive)
    private let writerQueue = DispatchQueue(label: "com.taka.webcam.writer", qos: .userInteractive)

    var isRecording: Bool { _isRecording }

    var recordingDurationMs: Int64 {
        guard let startDate = recordingStartDate else { return 0 }
        return Int64(Date().timeIntervalSince(startDate) * 1000)
    }

    init(outputPath: URL, configuration: WebcamRecordingConfiguration) {
        self.outputPath = outputPath
        self.configuration = configuration
        super.init()
    }

    func start() throws {
        guard !_isRecording else {
            throw WebcamRecorderError.alreadyRecording
        }

        print("WebcamRecorder: Starting...")

        // Check camera authorization status
        let cameraAuthStatus = AVCaptureDevice.authorizationStatus(for: .video)
        print("WebcamRecorder: Camera authorization status: \(cameraAuthStatus.rawValue)")
        // 0 = notDetermined, 1 = restricted, 2 = denied, 3 = authorized

        switch cameraAuthStatus {
        case .notDetermined:
            print("WebcamRecorder: Camera access not determined - requesting...")
            // Request access synchronously by waiting
            let semaphore = DispatchSemaphore(value: 0)
            var granted = false
            AVCaptureDevice.requestAccess(for: .video) { result in
                granted = result
                print("WebcamRecorder: Camera access request result: \(result)")
                semaphore.signal()
            }
            semaphore.wait()
            if !granted {
                print("WebcamRecorder: Camera access denied by user")
                throw WebcamRecorderError.noVideoDevice
            }
        case .restricted:
            print("WebcamRecorder: Camera access restricted")
            throw WebcamRecorderError.noVideoDevice
        case .denied:
            print("WebcamRecorder: Camera access denied - user needs to enable in System Settings > Privacy & Security > Camera")
            throw WebcamRecorderError.noVideoDevice
        case .authorized:
            print("WebcamRecorder: Camera access authorized")
        @unknown default:
            print("WebcamRecorder: Unknown camera authorization status")
        }

        // Also check microphone if we're capturing audio
        if configuration.captureAudio && configuration.audioDeviceID != "none" {
            let micAuthStatus = AVCaptureDevice.authorizationStatus(for: .audio)
            print("WebcamRecorder: Microphone authorization status: \(micAuthStatus.rawValue)")
            if micAuthStatus == .notDetermined {
                let semaphore = DispatchSemaphore(value: 0)
                AVCaptureDevice.requestAccess(for: .audio) { _ in
                    semaphore.signal()
                }
                semaphore.wait()
            }
        }

        // Create capture session
        let session = AVCaptureSession()
        session.beginConfiguration()

        // Set session preset for HD video
        if session.canSetSessionPreset(.hd1280x720) {
            session.sessionPreset = .hd1280x720
            print("WebcamRecorder: Using HD 1280x720 preset")
        } else if session.canSetSessionPreset(.high) {
            session.sessionPreset = .high
            print("WebcamRecorder: Using high preset")
        }

        // Setup video input (webcam) - use selected device or default
        guard let videoDevice = findVideoDevice(by: configuration.videoDeviceID) else {
            print("WebcamRecorder: No video device found for ID: \(configuration.videoDeviceID ?? "default")")
            throw WebcamRecorderError.noVideoDevice
        }
        print("WebcamRecorder: Using video device: \(videoDevice.localizedName)")
        print("WebcamRecorder: Device uniqueID: \(videoDevice.uniqueID)")
        print("WebcamRecorder: Device modelID: \(videoDevice.modelID)")
        print("WebcamRecorder: Device type: \(videoDevice.deviceType)")

        // Check if Portrait Effect (virtual background) is enabled
        if #available(macOS 14.0, *) {
            print("WebcamRecorder: Portrait Effect enabled system-wide: \(AVCaptureDevice.isPortraitEffectEnabled)")
            print("WebcamRecorder: Center Stage enabled: \(AVCaptureDevice.isCenterStageEnabled)")
            print("WebcamRecorder: Studio Light enabled: \(AVCaptureDevice.isStudioLightEnabled)")

            // Check if the device supports Center Stage and if we can control it
            if videoDevice.isCenterStageActive {
                print("WebcamRecorder: Center Stage is active on this device")
            }

            // Try to check available formats that might bypass effects
            print("WebcamRecorder: Active format: \(videoDevice.activeFormat.description)")
        }

        // Configure device settings if possible
        do {
            try videoDevice.lockForConfiguration()

            // On some devices, we might be able to disable certain effects
            // Unfortunately, Portrait Effect and Center Stage are system-level
            // and can only be changed in System Settings

            videoDevice.unlockForConfiguration()
        } catch {
            print("WebcamRecorder: Could not lock device for configuration: \(error)")
        }

        let videoDeviceInput = try AVCaptureDeviceInput(device: videoDevice)
        if session.canAddInput(videoDeviceInput) {
            session.addInput(videoDeviceInput)
            print("WebcamRecorder: Added video input")
        } else {
            throw WebcamRecorderError.cannotAddVideoInput
        }

        // Setup audio input if enabled
        if configuration.captureAudio && configuration.audioDeviceID != "none" {
            if let audioDevice = findAudioDevice() {
                print("WebcamRecorder: Using audio device: \(audioDevice.localizedName)")
                do {
                    let audioDeviceInput = try AVCaptureDeviceInput(device: audioDevice)
                    if session.canAddInput(audioDeviceInput) {
                        session.addInput(audioDeviceInput)
                        print("WebcamRecorder: Added audio input")
                    }
                } catch {
                    print("WebcamRecorder: Could not add audio input: \(error)")
                    // Continue without audio
                }
            } else {
                print("WebcamRecorder: No audio device found for ID: \(configuration.audioDeviceID ?? "nil")")
            }
        }

        // Setup video output
        let videoOutput = AVCaptureVideoDataOutput()
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.setSampleBufferDelegate(self, queue: videoQueue)
        videoOutput.alwaysDiscardsLateVideoFrames = false

        if session.canAddOutput(videoOutput) {
            session.addOutput(videoOutput)
            print("WebcamRecorder: Added video output")
        } else {
            throw WebcamRecorderError.cannotAddVideoOutput
        }
        self.videoOutput = videoOutput

        // Setup audio output if enabled
        if configuration.captureAudio && configuration.audioDeviceID != "none" {
            let audioOutput = AVCaptureAudioDataOutput()
            audioOutput.setSampleBufferDelegate(self, queue: audioQueue)

            if session.canAddOutput(audioOutput) {
                session.addOutput(audioOutput)
                self.audioOutput = audioOutput
                print("WebcamRecorder: Added audio output")
            }
        }

        session.commitConfiguration()

        // Add notification observers for session errors
        NotificationCenter.default.addObserver(
            forName: .AVCaptureSessionRuntimeError,
            object: session,
            queue: .main
        ) { notification in
            if let error = notification.userInfo?[AVCaptureSessionErrorKey] as? Error {
                print("WebcamRecorder: Session runtime error: \(error.localizedDescription)")
            }
        }

        NotificationCenter.default.addObserver(
            forName: .AVCaptureSessionWasInterrupted,
            object: session,
            queue: .main
        ) { notification in
            print("WebcamRecorder: Session was interrupted")
        }

        NotificationCenter.default.addObserver(
            forName: .AVCaptureSessionDidStartRunning,
            object: session,
            queue: .main
        ) { _ in
            print("WebcamRecorder: Session did start running")
        }

        // Setup asset writer
        try setupAssetWriter()
        print("WebcamRecorder: Asset writer setup complete, status: \(assetWriter?.status.rawValue ?? -1)")

        // Store session
        self.captureSession = session

        // Mark as recording BEFORE starting capture session
        // This ensures the delegate callbacks can write frames immediately
        _isRecording = true
        recordingStartDate = Date()

        // Start the capture session on the main thread (required for proper delegate callbacks)
        // AVCaptureSession.startRunning() must be called from a thread with a run loop
        print("WebcamRecorder: Starting capture session...")

        if Thread.isMainThread {
            session.startRunning()
        } else {
            DispatchQueue.main.sync {
                session.startRunning()
            }
        }

        // Wait a brief moment for camera to warm up and first frames to arrive
        Thread.sleep(forTimeInterval: 0.5)

        print("WebcamRecorder: Recording started, session running: \(session.isRunning)")
    }

    func stop() throws {
        guard _isRecording else {
            throw WebcamRecorderError.notRecording
        }

        print("WebcamRecorder: Stopping... sessionStarted=\(sessionStarted), frameCount=\(frameCount)")

        _isRecording = false

        // Remove notification observers
        if let session = captureSession {
            NotificationCenter.default.removeObserver(self, name: .AVCaptureSessionRuntimeError, object: session)
            NotificationCenter.default.removeObserver(self, name: .AVCaptureSessionWasInterrupted, object: session)
            NotificationCenter.default.removeObserver(self, name: .AVCaptureSessionDidStartRunning, object: session)
        }

        // Stop capture session
        captureSession?.stopRunning()
        captureSession = nil

        // Finalize asset writer
        writerQueue.sync {
            print("WebcamRecorder: Finalizing asset writer, status: \(self.assetWriter?.status.rawValue ?? -1)")

            videoInput?.markAsFinished()
            audioInput?.markAsFinished()

            if let writer = self.assetWriter {
                if writer.status == .writing {
                    let semaphore = DispatchSemaphore(value: 0)
                    writer.finishWriting {
                        print("WebcamRecorder: finishWriting completed, status: \(writer.status.rawValue), error: \(writer.error?.localizedDescription ?? "none")")
                        semaphore.signal()
                    }
                    semaphore.wait()
                } else {
                    print("WebcamRecorder: Writer not in writing state, status: \(writer.status.rawValue), error: \(writer.error?.localizedDescription ?? "none")")
                }
            }
        }

        print("WebcamRecorder: Stopped, wrote \(frameCount) frames")

        // Cleanup
        assetWriter = nil
        videoInput = nil
        audioInput = nil
        videoOutput = nil
        audioOutput = nil
        startTime = nil
        sessionStarted = false
        frameCount = 0
    }

    func cancel() {
        _isRecording = false

        captureSession?.stopRunning()
        captureSession = nil

        assetWriter?.cancelWriting()

        // Delete partial file
        try? FileManager.default.removeItem(at: outputPath)

        // Cleanup
        assetWriter = nil
        videoInput = nil
        audioInput = nil
        videoOutput = nil
        audioOutput = nil
        startTime = nil
        sessionStarted = false
    }

    private func findAudioDevice() -> AVCaptureDevice? {
        // If specific device ID requested, find it
        if let deviceID = configuration.audioDeviceID, deviceID != "none" {
            // Try to find device by unique ID
            let discoverySession = AVCaptureDevice.DiscoverySession(
                deviceTypes: [.builtInMicrophone, .externalUnknown],
                mediaType: .audio,
                position: .unspecified
            )

            // Try matching by index first (e.g., "0", "1", "2")
            if let index = Int(deviceID), index < discoverySession.devices.count {
                return discoverySession.devices[index]
            }

            // Try matching by unique ID
            for device in discoverySession.devices {
                if device.uniqueID == deviceID {
                    return device
                }
            }
        }

        // Fall back to default audio device
        return AVCaptureDevice.default(for: .audio)
    }

    private func setupAssetWriter() throws {
        // Remove existing file if present
        try? FileManager.default.removeItem(at: outputPath)

        // Create asset writer
        assetWriter = try AVAssetWriter(outputURL: outputPath, fileType: .mp4)

        // Video settings
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: configuration.width,
            AVVideoHeightKey: configuration.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: configuration.bitrate,
                AVVideoMaxKeyFrameIntervalKey: configuration.fps,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoExpectedSourceFrameRateKey: configuration.fps,
                AVVideoAllowFrameReorderingKey: false,
            ]
        ]

        videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoInput?.expectsMediaDataInRealTime = true

        if assetWriter!.canAdd(videoInput!) {
            assetWriter!.add(videoInput!)
        }

        // Audio settings if enabled
        if configuration.captureAudio && configuration.audioDeviceID != "none" {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 128000
            ]

            audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            audioInput?.expectsMediaDataInRealTime = true

            if assetWriter!.canAdd(audioInput!) {
                assetWriter!.add(audioInput!)
            }
        }

        // Start writing
        assetWriter?.startWriting()
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate & AVCaptureAudioDataOutputSampleBufferDelegate
extension WebcamRecorder: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard _isRecording else { return }

        let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let isVideo = output == self.videoOutput

        writerQueue.async { [weak self] in
            guard let self = self, self._isRecording else { return }

            // Initialize start time and session on first frame
            if self.startTime == nil {
                self.startTime = presentationTime
                self.assetWriter?.startSession(atSourceTime: .zero)
                self.sessionStarted = true
                print("WebcamRecorder: First frame received, session started")
            }

            guard self.sessionStarted else { return }

            // Calculate relative time from recording start
            let relativeTime = CMTimeSubtract(presentationTime, self.startTime!)

            // Ensure we don't write negative timestamps
            guard CMTimeCompare(relativeTime, .zero) >= 0 else { return }

            if isVideo {
                self.handleVideoSample(sampleBuffer, at: relativeTime)
            } else {
                self.handleAudioSample(sampleBuffer, at: relativeTime)
            }
        }
    }

    private func handleVideoSample(_ sampleBuffer: CMSampleBuffer, at time: CMTime) {
        guard let videoInput = videoInput,
              CMSampleBufferDataIsReady(sampleBuffer) else {
            return
        }

        guard videoInput.isReadyForMoreMediaData else {
            // Skip frame if writer is not ready
            return
        }

        // Create timing info with relative timestamp
        var timingInfo = CMSampleTimingInfo(
            duration: CMSampleBufferGetDuration(sampleBuffer),
            presentationTimeStamp: time,
            decodeTimeStamp: .invalid
        )

        // Create new sample buffer with adjusted timing
        var adjustedBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateCopyWithNewTiming(
            allocator: kCFAllocatorDefault,
            sampleBuffer: sampleBuffer,
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timingInfo,
            sampleBufferOut: &adjustedBuffer
        )

        if status == noErr, let adjustedBuffer = adjustedBuffer {
            if videoInput.append(adjustedBuffer) {
                frameCount += 1
                if frameCount == 1 {
                    print("WebcamRecorder: First video frame written")
                } else if frameCount % 30 == 0 {
                    print("WebcamRecorder: Wrote \(frameCount) video frames")
                }
            } else {
                print("WebcamRecorder: Failed to append video frame, writer status: \(assetWriter?.status.rawValue ?? -1), error: \(assetWriter?.error?.localizedDescription ?? "none")")
            }
        }
    }

    private func handleAudioSample(_ sampleBuffer: CMSampleBuffer, at time: CMTime) {
        guard let audioInput = audioInput,
              audioInput.isReadyForMoreMediaData,
              CMSampleBufferDataIsReady(sampleBuffer) else {
            return
        }

        // Create timing info with relative timestamp
        var timingInfo = CMSampleTimingInfo(
            duration: CMSampleBufferGetDuration(sampleBuffer),
            presentationTimeStamp: time,
            decodeTimeStamp: .invalid
        )

        // Create new sample buffer with adjusted timing
        var adjustedBuffer: CMSampleBuffer?
        CMSampleBufferCreateCopyWithNewTiming(
            allocator: kCFAllocatorDefault,
            sampleBuffer: sampleBuffer,
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timingInfo,
            sampleBufferOut: &adjustedBuffer
        )

        if let adjustedBuffer = adjustedBuffer {
            audioInput.append(adjustedBuffer)
        }
    }
}

// MARK: - Errors
enum WebcamRecorderError: Error {
    case alreadyRecording
    case notRecording
    case noVideoDevice
    case noAudioDevice
    case cannotAddVideoInput
    case cannotAddAudioInput
    case cannotAddVideoOutput
    case cannotAddAudioOutput
    case writerFailed
}

// MARK: - Audio Device Enumeration
struct WebcamAudioDeviceInfo {
    let index: Int
    let uniqueID: String
    let name: String
}

func listWebcamAudioDevices() -> [WebcamAudioDeviceInfo] {
    let discoverySession = AVCaptureDevice.DiscoverySession(
        deviceTypes: [.builtInMicrophone, .externalUnknown],
        mediaType: .audio,
        position: .unspecified
    )

    return discoverySession.devices.enumerated().map { index, device in
        WebcamAudioDeviceInfo(
            index: index,
            uniqueID: device.uniqueID,
            name: device.localizedName
        )
    }
}

// MARK: - Video Device Enumeration
struct WebcamVideoDeviceInfo {
    let index: Int
    let uniqueID: String
    let name: String
}

func listWebcamVideoDevices() -> [WebcamVideoDeviceInfo] {
    // Include more device types to find all cameras including continuity cameras
    var deviceTypes: [AVCaptureDevice.DeviceType] = [
        .builtInWideAngleCamera,
        .externalUnknown
    ]

    // Add continuity camera on macOS 14+
    if #available(macOS 14.0, *) {
        deviceTypes.append(.external)
    }

    let discoverySession = AVCaptureDevice.DiscoverySession(
        deviceTypes: deviceTypes,
        mediaType: .video,
        position: .unspecified
    )

    // Debug: print all found devices
    for device in discoverySession.devices {
        print("WebcamRecorder: Found camera - name: '\(device.localizedName)', uniqueID: '\(device.uniqueID)', modelID: '\(device.modelID)', type: \(device.deviceType)")
    }

    return discoverySession.devices.enumerated().map { index, device in
        WebcamVideoDeviceInfo(
            index: index,
            uniqueID: device.uniqueID,
            name: device.localizedName
        )
    }
}

/// Find a video device by index or unique ID
func findVideoDevice(by identifier: String?) -> AVCaptureDevice? {
    // Include more device types to find all cameras
    var deviceTypes: [AVCaptureDevice.DeviceType] = [
        .builtInWideAngleCamera,
        .externalUnknown
    ]

    // Add continuity camera on macOS 14+
    if #available(macOS 14.0, *) {
        deviceTypes.append(.external)
    }

    guard let identifier = identifier else {
        // Return default camera
        return AVCaptureDevice.default(for: .video)
    }

    let discoverySession = AVCaptureDevice.DiscoverySession(
        deviceTypes: deviceTypes,
        mediaType: .video,
        position: .unspecified
    )

    // Try matching by index first (e.g., "0", "1", "2")
    if let index = Int(identifier), index < discoverySession.devices.count {
        return discoverySession.devices[index]
    }

    // Try matching by unique ID
    for device in discoverySession.devices {
        if device.uniqueID == identifier {
            return device
        }
    }

    // Fall back to default
    return AVCaptureDevice.default(for: .video)
}
