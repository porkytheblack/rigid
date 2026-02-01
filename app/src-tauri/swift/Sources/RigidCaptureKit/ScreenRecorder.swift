import Foundation
import ScreenCaptureKit
import AVFoundation
import CoreMedia
import VideoToolbox

/// Configuration for video recording
struct RecordingConfiguration {
    let width: Int
    let height: Int
    let fps: Int
    let bitrate: Int
    let keyframeInterval: Int
    let codec: VideoCodec
    let captureCursor: Bool
    let captureAudio: Bool
    let scaleFactor: CGFloat

    enum VideoCodec {
        case h264
        case hevc
        case proRes422
        case proRes422HQ

        var avCodecType: AVVideoCodecType {
            switch self {
            case .h264: return .h264
            case .hevc: return .hevc
            case .proRes422: return .proRes422
            case .proRes422HQ: return .proRes422HQ
            }
        }

        var fileType: AVFileType {
            switch self {
            case .h264, .hevc: return .mp4
            case .proRes422, .proRes422HQ: return .mov
            }
        }

        var fileExtension: String {
            switch self {
            case .h264, .hevc: return "mp4"
            case .proRes422, .proRes422HQ: return "mov"
            }
        }
    }
}

/// High-quality screen recorder using ScreenCaptureKit and AVAssetWriter
@available(macOS 12.3, *)
class ScreenRecorder: NSObject {
    private var stream: SCStream?
    private var assetWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var audioInput: AVAssetWriterInput?
    private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?

    private let filter: SCContentFilter
    private let outputPath: URL
    private let configuration: RecordingConfiguration

    private var frameCount: Int64 = 0
    private var startTime: CMTime?
    private var _isRecording: Bool = false
    private var recordingStartDate: Date?

    private let videoQueue = DispatchQueue(label: "com.rigid.capture.video", qos: .userInteractive)
    private let audioQueue = DispatchQueue(label: "com.rigid.capture.audio", qos: .userInteractive)

    var isRecording: Bool { _isRecording }

    var recordingDurationMs: Int64 {
        guard let startDate = recordingStartDate else { return 0 }
        return Int64(Date().timeIntervalSince(startDate) * 1000)
    }

    init(
        filter: SCContentFilter,
        outputPath: URL,
        configuration: RecordingConfiguration
    ) {
        self.filter = filter
        self.outputPath = outputPath
        self.configuration = configuration
        super.init()
    }

    func start() async throws {
        // Configure stream for native resolution capture
        let streamConfig = SCStreamConfiguration()

        // Use backing pixel dimensions for Retina-correct capture
        let pixelWidth = Int(CGFloat(configuration.width) * configuration.scaleFactor)
        let pixelHeight = Int(CGFloat(configuration.height) * configuration.scaleFactor)

        streamConfig.width = pixelWidth
        streamConfig.height = pixelHeight

        // Fixed 60fps capture with minimal latency
        // minimumFrameInterval defines the minimum time between frames
        streamConfig.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(configuration.fps))

        // Buffer frames to prevent drops during encoding spikes
        streamConfig.queueDepth = 8

        // Capture settings
        streamConfig.showsCursor = configuration.captureCursor
        if #available(macOS 13.0, *) {
            streamConfig.capturesAudio = configuration.captureAudio
        }

        // Pixel format - BGRA is most compatible with AVAssetWriter
        streamConfig.pixelFormat = kCVPixelFormatType_32BGRA

        // Color space - Rec.709 for standard content (web/display)
        if #available(macOS 13.0, *) {
            streamConfig.colorSpaceName = CGColorSpace.itur_709 as CFString
        }

        // Create stream
        stream = SCStream(filter: filter, configuration: streamConfig, delegate: self)

        // Setup asset writer for encoding
        try setupAssetWriter(width: pixelWidth, height: pixelHeight)

        // Add stream output for video
        try stream?.addStreamOutput(self, type: .screen, sampleHandlerQueue: videoQueue)

        // Add stream output for audio if enabled (macOS 13+)
        if configuration.captureAudio {
            if #available(macOS 13.0, *) {
                try stream?.addStreamOutput(self, type: .audio, sampleHandlerQueue: audioQueue)
            }
        }

        // Start capture
        try await stream?.startCapture()
        _isRecording = true
        recordingStartDate = Date()
    }

    func stop() async throws {
        guard _isRecording else { return }

        _isRecording = false

        // Stop capture
        try await stream?.stopCapture()
        stream = nil

        // Mark inputs as finished
        videoInput?.markAsFinished()
        audioInput?.markAsFinished()

        // Finalize asset writer
        await assetWriter?.finishWriting()

        // Cleanup
        assetWriter = nil
        videoInput = nil
        audioInput = nil
        pixelBufferAdaptor = nil
    }

    func cancel() {
        _isRecording = false

        // Stop capture without waiting
        stream?.stopCapture { _ in }
        stream = nil

        // Cancel asset writer
        assetWriter?.cancelWriting()

        // Delete partial file
        try? FileManager.default.removeItem(at: outputPath)

        // Cleanup
        assetWriter = nil
        videoInput = nil
        audioInput = nil
        pixelBufferAdaptor = nil
    }

    private func setupAssetWriter(width: Int, height: Int) throws {
        // Create asset writer with appropriate file type
        assetWriter = try AVAssetWriter(outputURL: outputPath, fileType: configuration.codec.fileType)

        // Video encoding settings
        let videoSettings = createVideoSettings(width: width, height: height)
        videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoInput?.expectsMediaDataInRealTime = true

        // Create pixel buffer adaptor for efficient frame writing
        let sourcePixelBufferAttributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
            kCVPixelBufferIOSurfacePropertiesKey as String: [:],
        ]

        pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: videoInput!,
            sourcePixelBufferAttributes: sourcePixelBufferAttributes
        )

        if assetWriter!.canAdd(videoInput!) {
            assetWriter!.add(videoInput!)
        }

        // Audio settings if enabled
        if configuration.captureAudio {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 48000,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 192000
            ]
            audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            audioInput?.expectsMediaDataInRealTime = true

            if assetWriter!.canAdd(audioInput!) {
                assetWriter!.add(audioInput!)
            }
        }

        // Start writing
        assetWriter?.startWriting()
        assetWriter?.startSession(atSourceTime: .zero)
    }

    private func createVideoSettings(width: Int, height: Int) -> [String: Any] {
        var settings: [String: Any] = [
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCodecKey: configuration.codec.avCodecType,
        ]

        // Compression properties for H.264/HEVC
        switch configuration.codec {
        case .h264:
            settings[AVVideoCompressionPropertiesKey] = [
                AVVideoAverageBitRateKey: configuration.bitrate,
                AVVideoMaxKeyFrameIntervalKey: configuration.keyframeInterval,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoExpectedSourceFrameRateKey: configuration.fps,
                AVVideoAllowFrameReorderingKey: false,  // Lower latency
            ]

        case .hevc:
            settings[AVVideoCompressionPropertiesKey] = [
                AVVideoAverageBitRateKey: configuration.bitrate,
                AVVideoMaxKeyFrameIntervalKey: configuration.keyframeInterval,
                AVVideoExpectedSourceFrameRateKey: configuration.fps,
                AVVideoAllowFrameReorderingKey: false,
            ]

        case .proRes422, .proRes422HQ:
            // ProRes doesn't use bitrate settings - quality is determined by codec type
            break
        }

        // Color properties for Rec.709 (standard for web/display content)
        settings[AVVideoColorPropertiesKey] = [
            AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
            AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
            AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
        ]

        return settings
    }
}

// MARK: - SCStreamDelegate
@available(macOS 12.3, *)
extension ScreenRecorder: SCStreamDelegate {
    func stream(_ stream: SCStream, didStopWithError error: Error) {
        print("ScreenRecorder: Stream stopped with error: \(error.localizedDescription)")
        _isRecording = false
    }
}

// MARK: - SCStreamOutput
@available(macOS 12.3, *)
extension ScreenRecorder: SCStreamOutput {
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard _isRecording else { return }

        switch type {
        case .screen:
            handleVideoSample(sampleBuffer)
        case .audio:
            handleAudioSample(sampleBuffer)
        @unknown default:
            break
        }
    }

    private func handleVideoSample(_ sampleBuffer: CMSampleBuffer) {
        guard let videoInput = videoInput,
              videoInput.isReadyForMoreMediaData,
              CMSampleBufferDataIsReady(sampleBuffer) else {
            return
        }

        // Get the image buffer from the sample
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return
        }

        // Get presentation timestamp from the capture
        let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)

        // Use first frame time as reference for relative timing
        if startTime == nil {
            startTime = presentationTime
        }

        // Calculate relative time from recording start
        let relativeTime = CMTimeSubtract(presentationTime, startTime!)

        // Append the pixel buffer with its timestamp
        if pixelBufferAdaptor?.append(imageBuffer, withPresentationTime: relativeTime) == true {
            frameCount += 1
        }
    }

    private func handleAudioSample(_ sampleBuffer: CMSampleBuffer) {
        guard let audioInput = audioInput,
              audioInput.isReadyForMoreMediaData,
              CMSampleBufferDataIsReady(sampleBuffer) else {
            return
        }

        // Adjust audio timestamp relative to video start
        if let startTime = startTime {
            let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            let relativeTime = CMTimeSubtract(presentationTime, startTime)

            // Create timing info with relative timestamp
            var timingInfo = CMSampleTimingInfo(
                duration: CMSampleBufferGetDuration(sampleBuffer),
                presentationTimeStamp: relativeTime,
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
        } else {
            audioInput.append(sampleBuffer)
        }
    }
}
