import AVFoundation
import CoreImage
import CoreMedia
import VideoToolbox
import AppKit

// MARK: - Data Structures

/// Clip types for rendering
enum ClipSourceType: String, Codable {
    case video
    case image
    case audio
}

/// Background types
enum BackgroundType: String, Codable {
    case solid
    case gradient
    case image
}

/// Gradient stop for gradient backgrounds
struct GradientStop: Codable {
    let color: String
    let position: Double
}

/// Background configuration
struct CompositorBackground: Codable {
    let backgroundType: BackgroundType
    let color: String?
    let gradientStops: [GradientStop]?
    let gradientAngle: Int?
    let imageUrl: String?
    let mediaPath: String?

    enum CodingKeys: String, CodingKey {
        case backgroundType = "background_type"
        case color
        case gradientStops = "gradient_stops"
        case gradientAngle = "gradient_angle"
        case imageUrl = "image_url"
        case mediaPath = "media_path"
    }
}

/// Clip configuration
struct CompositorClip: Codable {
    let sourcePath: String
    let sourceType: ClipSourceType
    let startTimeMs: Int64
    let durationMs: Int64
    let inPointMs: Int64
    let positionX: Double?
    let positionY: Double?
    let scale: Double?
    let opacity: Double?
    let cornerRadius: Int?
    let cropTop: Int?
    let cropBottom: Int?
    let cropLeft: Int?
    let cropRight: Int?
    let zIndex: Int
    let hasAudio: Bool?
    let trackId: String?
    let muted: Bool?

    enum CodingKeys: String, CodingKey {
        case sourcePath = "source_path"
        case sourceType = "source_type"
        case startTimeMs = "start_time_ms"
        case durationMs = "duration_ms"
        case inPointMs = "in_point_ms"
        case positionX = "position_x"
        case positionY = "position_y"
        case scale
        case opacity
        case cornerRadius = "corner_radius"
        case cropTop = "crop_top"
        case cropBottom = "crop_bottom"
        case cropLeft = "crop_left"
        case cropRight = "crop_right"
        case zIndex = "z_index"
        case hasAudio = "has_audio"
        case trackId = "track_id"
        case muted
    }
}

/// Zoom effect configuration
struct CompositorZoomClip: Codable {
    let targetTrackId: String
    let startTimeMs: Int64
    let durationMs: Int64
    let zoomScale: Double
    let zoomCenterX: Double
    let zoomCenterY: Double
    let easeInDurationMs: Int64
    let easeOutDurationMs: Int64

    enum CodingKeys: String, CodingKey {
        case targetTrackId = "target_track_id"
        case startTimeMs = "start_time_ms"
        case durationMs = "duration_ms"
        case zoomScale = "zoom_scale"
        case zoomCenterX = "zoom_center_x"
        case zoomCenterY = "zoom_center_y"
        case easeInDurationMs = "ease_in_duration_ms"
        case easeOutDurationMs = "ease_out_duration_ms"
    }
}

/// Blur effect configuration
struct CompositorBlurClip: Codable {
    let startTimeMs: Int64
    let durationMs: Int64
    let blurIntensity: Double
    let regionX: Double
    let regionY: Double
    let regionWidth: Double
    let regionHeight: Double
    let cornerRadius: Double
    let easeInDurationMs: Int64
    let easeOutDurationMs: Int64
    let zIndex: Int

    enum CodingKeys: String, CodingKey {
        case startTimeMs = "start_time_ms"
        case durationMs = "duration_ms"
        case blurIntensity = "blur_intensity"
        case regionX = "region_x"
        case regionY = "region_y"
        case regionWidth = "region_width"
        case regionHeight = "region_height"
        case cornerRadius = "corner_radius"
        case easeInDurationMs = "ease_in_duration_ms"
        case easeOutDurationMs = "ease_out_duration_ms"
        case zIndex = "z_index"
    }
}

/// Pan animation configuration
struct CompositorPanClip: Codable {
    let targetTrackId: String
    let startTimeMs: Int64
    let durationMs: Int64
    let startX: Double
    let startY: Double
    let endX: Double
    let endY: Double
    let easeInDurationMs: Int64
    let easeOutDurationMs: Int64
    let zIndex: Int

    enum CodingKeys: String, CodingKey {
        case targetTrackId = "target_track_id"
        case startTimeMs = "start_time_ms"
        case durationMs = "duration_ms"
        case startX = "start_x"
        case startY = "start_y"
        case endX = "end_x"
        case endY = "end_y"
        case easeInDurationMs = "ease_in_duration_ms"
        case easeOutDurationMs = "ease_out_duration_ms"
        case zIndex = "z_index"
    }
}

/// Quality presets
enum CompositorQuality: String, Codable {
    case draft
    case good
    case high
    case max
}

/// Full render configuration
struct CompositorConfig: Codable {
    let width: Int
    let height: Int
    let frameRate: Int
    let durationMs: Int64
    let format: String
    let quality: CompositorQuality
    let outputPath: String
    let background: CompositorBackground?
    let clips: [CompositorClip]
    let zoomClips: [CompositorZoomClip]?
    let blurClips: [CompositorBlurClip]?
    let panClips: [CompositorPanClip]?

    enum CodingKeys: String, CodingKey {
        case width, height
        case frameRate = "frame_rate"
        case durationMs = "duration_ms"
        case format, quality
        case outputPath = "output_path"
        case background, clips
        case zoomClips = "zoom_clips"
        case blurClips = "blur_clips"
        case panClips = "pan_clips"
    }
}

/// Progress callback type
typealias CompositorProgressCallback = (Float, Int64, Int64) -> Void

// MARK: - Custom Video Compositor

/// Instruction for custom compositor - contains all info needed to render a frame
class VideoCompositorInstruction: NSObject, AVVideoCompositionInstructionProtocol {
    var timeRange: CMTimeRange
    var enablePostProcessing: Bool = false
    var containsTweening: Bool = true
    var requiredSourceTrackIDs: [NSValue]?
    var passthroughTrackID: CMPersistentTrackID = kCMPersistentTrackID_Invalid

    // Custom properties for our rendering
    let outputSize: CGSize
    let background: CompositorBackground?
    let clips: [CompositorClip]
    let zoomClips: [CompositorZoomClip]?
    let blurClips: [CompositorBlurClip]?
    let panClips: [CompositorPanClip]?
    let trackIDToClipIndex: [CMPersistentTrackID: Int]

    init(timeRange: CMTimeRange,
         outputSize: CGSize,
         background: CompositorBackground?,
         clips: [CompositorClip],
         zoomClips: [CompositorZoomClip]?,
         blurClips: [CompositorBlurClip]?,
         panClips: [CompositorPanClip]?,
         trackIDToClipIndex: [CMPersistentTrackID: Int],
         sourceTrackIDs: [CMPersistentTrackID]) {
        self.timeRange = timeRange
        self.outputSize = outputSize
        self.background = background
        self.clips = clips
        self.zoomClips = zoomClips
        self.blurClips = blurClips
        self.panClips = panClips
        self.trackIDToClipIndex = trackIDToClipIndex
        // CMPersistentTrackID is Int32, wrap properly in NSNumber
        self.requiredSourceTrackIDs = sourceTrackIDs.map { trackID in
            NSNumber(value: trackID) as NSValue
        }
        super.init()
    }
}

/// Custom video compositor that uses Core Image for GPU-accelerated rendering
class CustomVideoCompositor: NSObject, AVVideoCompositing {

    // Required properties
    var sourcePixelBufferAttributes: [String: Any]? {
        return [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
    }

    var requiredPixelBufferAttributesForRenderContext: [String: Any] {
        return [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
    }

    var supportsWideColorSourceFrames: Bool { return true }
    var supportsHDRSourceFrames: Bool { return false }

    // Core Image context for GPU rendering
    private let ciContext: CIContext
    private var renderContext: AVVideoCompositionRenderContext?

    override init() {
        // Create Metal-backed Core Image context for best performance
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            self.ciContext = CIContext(mtlDevice: metalDevice, options: [
                .workingColorSpace: CGColorSpaceCreateDeviceRGB(),
                .cacheIntermediates: false
            ])
        } else {
            self.ciContext = CIContext(options: [
                .useSoftwareRenderer: false
            ])
        }
        super.init()
    }

    func renderContextChanged(_ newRenderContext: AVVideoCompositionRenderContext) {
        self.renderContext = newRenderContext
    }

    func startRequest(_ request: AVAsynchronousVideoCompositionRequest) {
        autoreleasepool {
            guard let instruction = request.videoCompositionInstruction as? VideoCompositorInstruction else {
                print("VideoCompositor: Invalid instruction type")
                request.finish(with: NSError(domain: "VideoCompositor", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid instruction"]))
                return
            }

            let compositionTime = request.compositionTime
            let outputSize = instruction.outputSize

            // Start with background
            var outputImage: CIImage
            do {
                outputImage = createBackgroundImage(
                    background: instruction.background,
                    size: outputSize,
                    time: compositionTime
                )
            } catch {
                print("VideoCompositor: Failed to create background: \(error)")
                request.finish(with: error as NSError)
                return
            }

            // Sort clips by z-index
            let sortedClips = instruction.clips.enumerated().sorted { $0.element.zIndex < $1.element.zIndex }

            // Composite each clip
            for (originalIndex, clip) in sortedClips {
                // Find the track ID for this clip
                guard let trackID = instruction.trackIDToClipIndex.first(where: { $0.value == originalIndex })?.key,
                      let sourceFrame = request.sourceFrame(byTrackID: trackID) else {
                    continue
                }

                // Check if clip is active at this time
                let clipStartSec = Double(clip.startTimeMs) / 1000.0
                let clipEndSec = clipStartSec + Double(clip.durationMs) / 1000.0
                let currentSec = CMTimeGetSeconds(compositionTime)

                guard currentSec >= clipStartSec && currentSec < clipEndSec else {
                    continue
                }

                // Convert pixel buffer to CIImage
                var clipImage = CIImage(cvPixelBuffer: sourceFrame)

                // Apply crop if needed
                clipImage = applyCrop(to: clipImage, clip: clip)

                // Apply corner radius if needed
                if let cornerRadius = clip.cornerRadius, cornerRadius > 0 {
                    clipImage = applyCornerRadius(to: clipImage, radius: CGFloat(cornerRadius))
                }

                // Apply pan effects (per-clip)
                if let panClips = instruction.panClips {
                    clipImage = applyPan(
                        to: clipImage,
                        clip: clip,
                        panClips: panClips,
                        time: compositionTime
                    )
                }

                // Apply zoom effects
                if let zoomClips = instruction.zoomClips {
                    clipImage = applyZoom(
                        to: clipImage,
                        clip: clip,
                        zoomClips: zoomClips,
                        time: compositionTime
                    )
                }

                // Apply scale and position
                let scale = clip.scale ?? 0.8
                let scaledWidth = outputSize.width * CGFloat(scale)
                let scaledHeight = outputSize.height * CGFloat(scale)

                // Scale the clip
                let scaleX = scaledWidth / clipImage.extent.width
                let scaleY = scaledHeight / clipImage.extent.height
                let scaleFactor = min(scaleX, scaleY)
                clipImage = clipImage.transformed(by: CGAffineTransform(scaleX: scaleFactor, y: scaleFactor))

                // Position the clip (centered by default)
                let posX = clip.positionX ?? (outputSize.width / 2)
                let posY = clip.positionY ?? (outputSize.height / 2)
                let offsetX = CGFloat(posX) - clipImage.extent.width / 2
                let offsetY = CGFloat(posY) - clipImage.extent.height / 2
                clipImage = clipImage.transformed(by: CGAffineTransform(translationX: offsetX, y: offsetY))

                // Apply opacity
                if let opacity = clip.opacity, opacity < 1.0 {
                    clipImage = clipImage.applyingFilter("CIColorMatrix", parameters: [
                        "inputAVector": CIVector(x: 0, y: 0, z: 0, w: CGFloat(opacity))
                    ])
                }

                // Composite over background
                outputImage = clipImage.composited(over: outputImage)
            }

            // Apply blur effects
            if let blurClips = instruction.blurClips {
                outputImage = applyBlurEffects(
                    to: outputImage,
                    blurClips: blurClips,
                    time: compositionTime,
                    outputSize: outputSize
                )
            }

            // Render to output pixel buffer
            guard let pixelBuffer = request.renderContext.newPixelBuffer() else {
                print("VideoCompositor: Failed to create pixel buffer at time \(CMTimeGetSeconds(compositionTime))")
                request.finish(with: NSError(domain: "VideoCompositor", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to create pixel buffer"]))
                return
            }

            // Crop to output size and ensure valid extent
            let outputRect = CGRect(origin: .zero, size: outputSize)

            // Check if outputImage has valid extent
            if outputImage.extent.isInfinite || outputImage.extent.isEmpty {
                print("VideoCompositor: Invalid output image extent at time \(CMTimeGetSeconds(compositionTime))")
                // Create a fallback solid color image
                outputImage = CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                    .cropped(to: outputRect)
            } else {
                outputImage = outputImage.cropped(to: outputRect)
            }

            ciContext.render(outputImage, to: pixelBuffer, bounds: outputRect, colorSpace: CGColorSpaceCreateDeviceRGB())

            request.finish(withComposedVideoFrame: pixelBuffer)
        }
    }

    func cancelAllPendingVideoCompositionRequests() {
        // Nothing to cancel in our synchronous implementation
    }

    // MARK: - Helper Methods

    private func createBackgroundImage(background: CompositorBackground?, size: CGSize, time: CMTime) -> CIImage {
        guard let bg = background else {
            // Default dark background
            return CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                .cropped(to: CGRect(origin: .zero, size: size))
        }

        switch bg.backgroundType {
        case .solid:
            let color = parseColor(bg.color ?? "#1a1a2e")
            return CIImage(color: color).cropped(to: CGRect(origin: .zero, size: size))

        case .gradient:
            return createGradientImage(
                stops: bg.gradientStops ?? [
                    GradientStop(color: "#1a1a2e", position: 0),
                    GradientStop(color: "#2d2d44", position: 1)
                ],
                angle: bg.gradientAngle ?? 180,
                size: size
            )

        case .image:
            if let imagePath = bg.mediaPath ?? bg.imageUrl,
               let nsImage = NSImage(contentsOfFile: imagePath),
               let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) {
                var image = CIImage(cgImage: cgImage)
                // Scale to fill
                let scaleX = size.width / image.extent.width
                let scaleY = size.height / image.extent.height
                let scale = max(scaleX, scaleY)
                image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
                // Center crop
                let offsetX = (image.extent.width - size.width) / 2
                let offsetY = (image.extent.height - size.height) / 2
                return image.cropped(to: CGRect(x: offsetX, y: offsetY, width: size.width, height: size.height))
                    .transformed(by: CGAffineTransform(translationX: -offsetX, y: -offsetY))
            }
            // Fallback to solid color
            return CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                .cropped(to: CGRect(origin: .zero, size: size))
        }
    }

    private func parseColor(_ hex: String) -> CIColor {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0

        return CIColor(red: r, green: g, blue: b)
    }

    private func createGradientImage(stops: [GradientStop], angle: Int, size: CGSize) -> CIImage {
        // Create gradient using Core Image
        guard stops.count >= 2 else {
            return CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                .cropped(to: CGRect(origin: .zero, size: size))
        }

        let color0 = parseColor(stops.first!.color)
        let color1 = parseColor(stops.last!.color)

        // Calculate gradient direction based on angle
        let angleRad = CGFloat(angle) * .pi / 180.0
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let radius = sqrt(size.width * size.width + size.height * size.height) / 2

        let startPoint = CGPoint(
            x: center.x - cos(angleRad) * radius,
            y: center.y - sin(angleRad) * radius
        )
        let endPoint = CGPoint(
            x: center.x + cos(angleRad) * radius,
            y: center.y + sin(angleRad) * radius
        )

        guard let gradient = CIFilter(name: "CILinearGradient") else {
            return CIImage(color: color0).cropped(to: CGRect(origin: .zero, size: size))
        }

        gradient.setValue(CIVector(cgPoint: startPoint), forKey: "inputPoint0")
        gradient.setValue(CIVector(cgPoint: endPoint), forKey: "inputPoint1")
        gradient.setValue(color0, forKey: "inputColor0")
        gradient.setValue(color1, forKey: "inputColor1")

        return gradient.outputImage?.cropped(to: CGRect(origin: .zero, size: size)) ??
            CIImage(color: color0).cropped(to: CGRect(origin: .zero, size: size))
    }

    private func applyCrop(to image: CIImage, clip: CompositorClip) -> CIImage {
        let cropTop = CGFloat(clip.cropTop ?? 0) / 100.0
        let cropBottom = CGFloat(clip.cropBottom ?? 0) / 100.0
        let cropLeft = CGFloat(clip.cropLeft ?? 0) / 100.0
        let cropRight = CGFloat(clip.cropRight ?? 0) / 100.0

        guard cropTop > 0 || cropBottom > 0 || cropLeft > 0 || cropRight > 0 else {
            return image
        }

        let extent = image.extent
        let x = extent.width * cropLeft
        let y = extent.height * cropBottom
        let width = extent.width * (1 - cropLeft - cropRight)
        let height = extent.height * (1 - cropTop - cropBottom)

        return image.cropped(to: CGRect(x: x, y: y, width: width, height: height))
            .transformed(by: CGAffineTransform(translationX: -x, y: -y))
    }

    private func applyCornerRadius(to image: CIImage, radius: CGFloat) -> CIImage {
        // Create a rounded rectangle mask
        let extent = image.extent

        guard let roundedRectGenerator = CIFilter(name: "CIRoundedRectangleGenerator") else {
            return image
        }

        roundedRectGenerator.setValue(CIVector(cgRect: extent), forKey: "inputExtent")
        roundedRectGenerator.setValue(radius, forKey: "inputRadius")
        roundedRectGenerator.setValue(CIColor.white, forKey: "inputColor")

        guard let mask = roundedRectGenerator.outputImage else {
            return image
        }

        // Use blend with mask
        guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
            return image
        }

        let transparent = CIImage(color: CIColor.clear).cropped(to: extent)

        blendFilter.setValue(image, forKey: kCIInputImageKey)
        blendFilter.setValue(transparent, forKey: kCIInputBackgroundImageKey)
        blendFilter.setValue(mask, forKey: kCIInputMaskImageKey)

        return blendFilter.outputImage ?? image
    }

    private func applyZoom(to image: CIImage, clip: CompositorClip, zoomClips: [CompositorZoomClip], time: CMTime) -> CIImage {
        guard let trackId = clip.trackId else { return image }

        let currentSec = CMTimeGetSeconds(time)
        var resultImage = image

        for zoom in zoomClips where zoom.targetTrackId == trackId {
            let zoomStartSec = Double(zoom.startTimeMs) / 1000.0
            let zoomEndSec = zoomStartSec + Double(zoom.durationMs) / 1000.0

            guard currentSec >= zoomStartSec && currentSec < zoomEndSec else { continue }

            // Calculate zoom factor with easing
            let progress = (currentSec - zoomStartSec) / (zoomEndSec - zoomStartSec)
            let easeInSec = Double(zoom.easeInDurationMs) / 1000.0
            let easeOutSec = Double(zoom.easeOutDurationMs) / 1000.0
            let durationSec = zoomEndSec - zoomStartSec

            var zoomFactor: Double = zoom.zoomScale

            // Apply ease in
            if currentSec < zoomStartSec + easeInSec {
                let easeProgress = (currentSec - zoomStartSec) / easeInSec
                let easedProgress = easeInOutQuad(easeProgress)
                zoomFactor = 1.0 + (zoom.zoomScale - 1.0) * easedProgress
            }
            // Apply ease out
            else if currentSec > zoomEndSec - easeOutSec {
                let easeProgress = (currentSec - (zoomEndSec - easeOutSec)) / easeOutSec
                let easedProgress = easeInOutQuad(easeProgress)
                zoomFactor = zoom.zoomScale - (zoom.zoomScale - 1.0) * easedProgress
            }

            // Apply zoom using FFmpeg approach: scale then crop
            let extent = resultImage.extent
            let imageWidth = extent.width
            let imageHeight = extent.height

            // Center ratios (0-1)
            let centerXRatio = CGFloat(zoom.zoomCenterX / 100.0)
            // Flip Y for Core Image's bottom-left origin: UI y=0 is top, CI y=0 is bottom
            let centerYRatio = CGFloat((100.0 - zoom.zoomCenterY) / 100.0)

            // 1. Scale the image (scaling happens from origin)
            resultImage = resultImage.transformed(by: CGAffineTransform(
                scaleX: CGFloat(zoomFactor), y: CGFloat(zoomFactor)
            ))

            // 2. Calculate crop position accounting for scaled extent origin
            let scaledExtent = resultImage.extent
            let cropX = scaledExtent.origin.x + imageWidth * (CGFloat(zoomFactor) - 1) * centerXRatio
            let cropY = scaledExtent.origin.y + imageHeight * (CGFloat(zoomFactor) - 1) * centerYRatio

            // 3. Crop back to original size and translate to origin
            let cropRect = CGRect(x: cropX, y: cropY, width: imageWidth, height: imageHeight)
            resultImage = resultImage.cropped(to: cropRect)
                .transformed(by: CGAffineTransform(translationX: -cropRect.origin.x, y: -cropRect.origin.y))
        }

        return resultImage
    }

    private func applyPan(to image: CIImage, clip: CompositorClip, panClips: [CompositorPanClip], time: CMTime) -> CIImage {
        guard let trackId = clip.trackId else { return image }

        let currentSec = CMTimeGetSeconds(time)
        var resultImage = image
        let imageSize = image.extent.size

        for pan in panClips where pan.targetTrackId == trackId {
            let panStartSec = Double(pan.startTimeMs) / 1000.0
            let panEndSec = panStartSec + Double(pan.durationMs) / 1000.0

            guard currentSec >= panStartSec && currentSec < panEndSec else { continue }

            // Calculate progress with easing
            let progress = (currentSec - panStartSec) / (panEndSec - panStartSec)
            let easeInSec = Double(pan.easeInDurationMs) / 1000.0
            let easeOutSec = Double(pan.easeOutDurationMs) / 1000.0

            var easedProgress = progress

            // Apply ease in
            if currentSec < panStartSec + easeInSec && easeInSec > 0 {
                let easeProgress = (currentSec - panStartSec) / easeInSec
                easedProgress = easeInOutQuad(easeProgress) * (easeInSec / (panEndSec - panStartSec))
            }
            // Apply ease out
            else if currentSec > panEndSec - easeOutSec && easeOutSec > 0 {
                let easeProgress = (currentSec - (panEndSec - easeOutSec)) / easeOutSec
                let totalDuration = panEndSec - panStartSec
                let easeOutRatio = easeOutSec / totalDuration
                easedProgress = 1.0 - (1.0 - easeInOutQuad(easeProgress)) * easeOutRatio
            }

            // Interpolate position
            let currentX = pan.startX + (pan.endX - pan.startX) * easedProgress
            let currentY = pan.startY + (pan.endY - pan.startY) * easedProgress

            // Scale up and crop to create pan effect (scale factor = 1.5)
            let scaleFactor: CGFloat = 1.5
            resultImage = resultImage.transformed(by: CGAffineTransform(
                scaleX: scaleFactor, y: scaleFactor
            ))

            // Calculate max pan offset based on the clip's image size
            let maxOffsetX = imageSize.width * scaleFactor - imageSize.width
            let maxOffsetY = imageSize.height * scaleFactor - imageSize.height

            // Apple native coordinate formula:
            // X: position directly maps (0=left, 100=right)
            // Y: inverted because Core Image has bottom-left origin but user expects top-left
            //    (0=top -> maxOffset, 100=bottom -> 0)
            let offsetX = CGFloat(currentX / 100.0) * maxOffsetX
            let offsetY = CGFloat((100.0 - currentY) / 100.0) * maxOffsetY

            let cropRect = CGRect(x: offsetX, y: offsetY, width: imageSize.width, height: imageSize.height)
            resultImage = resultImage.cropped(to: cropRect)
                .transformed(by: CGAffineTransform(translationX: -offsetX, y: -offsetY))
        }

        return resultImage
    }

    private func applyBlurEffects(to image: CIImage, blurClips: [CompositorBlurClip], time: CMTime, outputSize: CGSize) -> CIImage {
        let currentSec = CMTimeGetSeconds(time)
        var resultImage = image

        for blur in blurClips.sorted(by: { $0.zIndex < $1.zIndex }) {
            let blurStartSec = Double(blur.startTimeMs) / 1000.0
            let blurEndSec = blurStartSec + Double(blur.durationMs) / 1000.0

            guard currentSec >= blurStartSec && currentSec < blurEndSec else { continue }

            // Calculate blur region
            let regionX = outputSize.width * CGFloat(blur.regionX / 100.0)
            // Flip Y coordinate for Core Image's bottom-left origin
            let regionY = outputSize.height * (1.0 - CGFloat(blur.regionY / 100.0))
            let regionW = outputSize.width * CGFloat(blur.regionWidth / 100.0)
            let regionH = outputSize.height * CGFloat(blur.regionHeight / 100.0)

            let blurRect = CGRect(
                x: regionX - regionW / 2,
                y: regionY - regionH / 2,
                width: regionW,
                height: regionH
            )

            // Extract region, blur it, composite back
            let regionImage = resultImage.cropped(to: blurRect)

            guard let blurFilter = CIFilter(name: "CIGaussianBlur") else { continue }
            blurFilter.setValue(regionImage, forKey: kCIInputImageKey)
            blurFilter.setValue(blur.blurIntensity * 0.5, forKey: kCIInputRadiusKey)

            guard let blurredRegion = blurFilter.outputImage?.cropped(to: blurRect) else { continue }

            resultImage = blurredRegion.composited(over: resultImage)
        }

        return resultImage
    }

    private func easeInOutQuad(_ t: Double) -> Double {
        if t < 0.5 {
            return 2 * t * t
        } else {
            return 1 - pow(-2 * t + 2, 2) / 2
        }
    }
}

// MARK: - Video Compositor Engine

/// Main compositor engine that orchestrates the rendering
@available(macOS 12.0, *)
class VideoCompositorEngine {

    private var progressCallback: CompositorProgressCallback?
    private var isCancelled = false

    func render(config: CompositorConfig, progress: CompositorProgressCallback?) async throws -> String {
        self.progressCallback = progress
        self.isCancelled = false

        let outputURL = URL(fileURLWithPath: config.outputPath)

        // Create parent directory if needed
        let parentDir = outputURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: parentDir, withIntermediateDirectories: true)

        // Remove existing file
        try? FileManager.default.removeItem(at: outputURL)

        // Create composition
        let composition = AVMutableComposition()

        // Track mapping for compositor
        var trackIDToClipIndex: [CMPersistentTrackID: Int] = [:]
        var videoTracks: [AVMutableCompositionTrack] = []
        var audioTracks: [(track: AVMutableCompositionTrack, clip: CompositorClip)] = []

        // Sort clips by z-index for proper layering
        let sortedClips = config.clips.enumerated().sorted { $0.element.zIndex < $1.element.zIndex }

        // Add video clips only (images are handled differently)
        for (index, clip) in sortedClips where clip.sourceType == .video {
            let sourceURL = URL(fileURLWithPath: clip.sourcePath)
            let asset = AVURLAsset(url: sourceURL)

            guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
                print("VideoCompositor: No video track in \(clip.sourcePath)")
                continue
            }

            // Get actual track duration
            let trackDuration = try await videoTrack.load(.timeRange).duration
            let trackDurationSec = CMTimeGetSeconds(trackDuration)
            print("VideoCompositor: Source video track duration: \(trackDurationSec)s")

            // Create composition track
            guard let compositionTrack = composition.addMutableTrack(
                withMediaType: .video,
                preferredTrackID: kCMPersistentTrackID_Invalid
            ) else {
                continue
            }

            let startTime = CMTime(value: CMTimeValue(clip.startTimeMs), timescale: 1000)
            var duration = CMTime(value: CMTimeValue(clip.durationMs), timescale: 1000)
            let inPoint = CMTime(value: CMTimeValue(clip.inPointMs), timescale: 1000)

            // Clamp duration to available track duration from in-point
            let availableDuration = CMTimeSubtract(trackDuration, inPoint)
            if CMTimeCompare(duration, availableDuration) > 0 {
                print("VideoCompositor: Clamping duration from \(CMTimeGetSeconds(duration))s to \(CMTimeGetSeconds(availableDuration))s")
                duration = availableDuration
            }

            let timeRange = CMTimeRange(start: inPoint, duration: duration)
            print("VideoCompositor: Inserting clip at \(CMTimeGetSeconds(startTime))s, inPoint: \(CMTimeGetSeconds(inPoint))s, duration: \(CMTimeGetSeconds(duration))s")

            try compositionTrack.insertTimeRange(timeRange, of: videoTrack, at: startTime)

            trackIDToClipIndex[compositionTrack.trackID] = index
            videoTracks.append(compositionTrack)

            // Add audio if present and not muted
            if clip.hasAudio == true && clip.muted != true {
                if let audioTrack = try await asset.loadTracks(withMediaType: .audio).first,
                   let audioCompTrack = composition.addMutableTrack(
                    withMediaType: .audio,
                    preferredTrackID: kCMPersistentTrackID_Invalid
                   ) {
                    try audioCompTrack.insertTimeRange(timeRange, of: audioTrack, at: startTime)
                    audioTracks.append((audioCompTrack, clip))
                }
            }
        }

        // If no video tracks, we need to use a different approach - generate frames directly
        // This handles image-only or background-only compositions
        let hasVideoTracks = !videoTracks.isEmpty

        // Add audio-only clips
        for (index, clip) in sortedClips where clip.sourceType == .audio {
            let sourceURL = URL(fileURLWithPath: clip.sourcePath)
            let asset = AVURLAsset(url: sourceURL)

            guard let audioTrack = try await asset.loadTracks(withMediaType: .audio).first else {
                continue
            }

            guard let compositionTrack = composition.addMutableTrack(
                withMediaType: .audio,
                preferredTrackID: kCMPersistentTrackID_Invalid
            ) else {
                continue
            }

            let startTime = CMTime(value: CMTimeValue(clip.startTimeMs), timescale: 1000)
            let duration = CMTime(value: CMTimeValue(clip.durationMs), timescale: 1000)
            let inPoint = CMTime(value: CMTimeValue(clip.inPointMs), timescale: 1000)

            try compositionTrack.insertTimeRange(
                CMTimeRange(start: inPoint, duration: duration),
                of: audioTrack,
                at: startTime
            )

            audioTracks.append((compositionTrack, clip))
        }

        // Always use direct frame generation - it's more reliable and gives us full control
        // The AVVideoComposition custom compositor approach has issues with timeline management
        print("VideoCompositor: Using direct frame generation (hasVideoTracks: \(hasVideoTracks))")
        try await exportWithDirectFrameGeneration(
            outputURL: outputURL,
            config: config,
            audioComposition: composition.tracks(withMediaType: .audio).isEmpty ? nil : composition
        )

        return config.outputPath
    }

    /// Video clip source - holds asset and track info for on-demand frame reading
    private class VideoClipSource {
        let clip: CompositorClip
        let asset: AVURLAsset
        let videoTrack: AVAssetTrack
        let clipStartSec: Double
        let clipEndSec: Double
        let inPointSec: Double
        let sourceFrameRate: Double

        // Use AVAssetImageGenerator for random access (simpler and works for our use case)
        let imageGenerator: AVAssetImageGenerator

        init(clip: CompositorClip) async throws {
            self.clip = clip
            self.clipStartSec = Double(clip.startTimeMs) / 1000.0
            self.clipEndSec = clipStartSec + Double(clip.durationMs) / 1000.0
            self.inPointSec = Double(clip.inPointMs) / 1000.0

            let url = URL(fileURLWithPath: clip.sourcePath)
            self.asset = AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])

            // Load video track
            let tracks = try await asset.loadTracks(withMediaType: .video)
            guard let track = tracks.first else {
                throw NSError(domain: "VideoClipSource", code: -1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
            }
            self.videoTrack = track

            // Get frame rate
            let nominalFrameRate = try await track.load(.nominalFrameRate)
            self.sourceFrameRate = Double(nominalFrameRate > 0 ? nominalFrameRate : 30)

            // Setup image generator with tolerance for performance
            self.imageGenerator = AVAssetImageGenerator(asset: asset)
            imageGenerator.appliesPreferredTrackTransform = true
            // Allow some tolerance for much better performance
            imageGenerator.requestedTimeToleranceBefore = CMTime(seconds: 0.1, preferredTimescale: 600)
            imageGenerator.requestedTimeToleranceAfter = CMTime(seconds: 0.1, preferredTimescale: 600)

            print("VideoCompositor: Initialized source for \(clip.sourcePath), frameRate: \(sourceFrameRate)")
        }

        func isActive(at compositionTimeSec: Double) -> Bool {
            return compositionTimeSec >= clipStartSec && compositionTimeSec < clipEndSec
        }

        func getSourceTime(at compositionTimeSec: Double) -> CMTime {
            let relativeTime = compositionTimeSec - clipStartSec
            let sourceTime = inPointSec + relativeTime
            return CMTime(seconds: sourceTime, preferredTimescale: 600)
        }
    }

    /// Export by generating frames directly with full video support
    /// Uses DispatchGroup pattern for proper async coordination (proven approach from VideoIO/FYVideoCompressor)
    private func exportWithDirectFrameGeneration(
        outputURL: URL,
        config: CompositorConfig,
        audioComposition: AVComposition?
    ) async throws {
        print("VideoCompositor: Starting export to \(outputURL.path)")

        // Create Metal-backed CIContext for GPU rendering
        let metalDevice = MTLCreateSystemDefaultDevice()!
        let ciContext = CIContext(mtlDevice: metalDevice, options: [
            .cacheIntermediates: false,
            .priorityRequestLow: false
        ])

        // Initialize video sources (just metadata, no frame loading yet)
        print("VideoCompositor: Initializing video sources...")
        var videoSources: [VideoClipSource] = []
        for clip in config.clips where clip.sourceType == .video {
            do {
                let source = try await VideoClipSource(clip: clip)
                videoSources.append(source)
            } catch {
                print("VideoCompositor: Failed to init source for \(clip.sourcePath): \(error)")
            }
        }
        print("VideoCompositor: Initialized \(videoSources.count) video sources")

        // Create asset writer
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

        // Video settings - hardware encoding via VideoToolbox
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: config.width,
            AVVideoHeightKey: config.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: bitrateForQuality(config.quality, width: config.width, height: config.height),
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoExpectedSourceFrameRateKey: config.frameRate
            ]
        ]

        let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoInput.expectsMediaDataInRealTime = false
        writer.add(videoInput)

        // Pixel buffer adaptor with Metal compatibility
        let pixelBufferAttributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: config.width,
            kCVPixelBufferHeightKey as String: config.height,
            kCVPixelBufferMetalCompatibilityKey as String: true,
            kCVPixelBufferIOSurfacePropertiesKey as String: [:] // Enable IOSurface for zero-copy
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: videoInput,
            sourcePixelBufferAttributes: pixelBufferAttributes
        )

        // Audio setup
        var audioInput: AVAssetWriterInput? = nil
        var audioOutput: AVAssetReaderAudioMixOutput? = nil
        var audioReader: AVAssetReader? = nil

        if let audioComp = audioComposition, !audioComp.tracks(withMediaType: .audio).isEmpty {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 48000,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 320000
            ]
            let ai = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            ai.expectsMediaDataInRealTime = false
            writer.add(ai)
            audioInput = ai

            let reader = try AVAssetReader(asset: audioComp)
            let ao = AVAssetReaderAudioMixOutput(audioTracks: audioComp.tracks(withMediaType: .audio), audioSettings: nil)
            reader.add(ao)
            audioOutput = ao
            audioReader = reader
        }

        // Start writing
        guard writer.startWriting() else {
            throw writer.error ?? NSError(domain: "VideoCompositor", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to start writing"])
        }
        writer.startSession(atSourceTime: .zero)
        audioReader?.startReading()

        let totalFrames = Int64(config.durationMs) * Int64(config.frameRate) / 1000
        let frameDuration = CMTime(value: 1, timescale: CMTimeScale(config.frameRate))
        let outputSize = CGSize(width: config.width, height: config.height)

        print("VideoCompositor: Starting frame generation, totalFrames: \(totalFrames)")

        // Use DispatchGroup for proper coordination
        let group = DispatchGroup()
        let videoQueue = DispatchQueue(label: "video.compositor.video", qos: .userInitiated)
        let audioQueue = DispatchQueue(label: "video.compositor.audio", qos: .userInitiated)

        var videoError: Error? = nil
        var framesWritten: Int64 = 0

        // Video encoding
        group.enter()
        videoInput.requestMediaDataWhenReady(on: videoQueue) { [weak self] in
            guard let self = self else {
                videoInput.markAsFinished()
                group.leave()
                return
            }

            while videoInput.isReadyForMoreMediaData && !self.isCancelled {
                if framesWritten >= totalFrames {
                    videoInput.markAsFinished()
                    group.leave()
                    return
                }

                let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(framesWritten))
                let currentTimeSec = CMTimeGetSeconds(presentationTime)

                autoreleasepool {
                    // Create composite frame
                    if let pixelBuffer = self.createCompositeFrameSync(
                        timeSec: currentTimeSec,
                        config: config,
                        outputSize: outputSize,
                        ciContext: ciContext,
                        adaptor: adaptor,
                        videoSources: videoSources
                    ) {
                        if !adaptor.append(pixelBuffer, withPresentationTime: presentationTime) {
                            print("VideoCompositor: Failed to append frame \(framesWritten)")
                            if writer.status == .failed {
                                videoError = writer.error
                                videoInput.markAsFinished()
                                group.leave()
                                return
                            }
                        }
                    }
                }

                framesWritten += 1

                // Report progress
                if framesWritten % 30 == 0 || framesWritten == totalFrames {
                    let progress = Float(framesWritten) / Float(totalFrames) * 100.0  // 0-100 percentage
                    DispatchQueue.main.async {
                        self.progressCallback?(progress, framesWritten, totalFrames)
                    }
                }
            }
        }

        // Audio encoding (if present)
        if let audioInput = audioInput, let audioOutput = audioOutput {
            group.enter()
            audioInput.requestMediaDataWhenReady(on: audioQueue) { [weak self] in
                while audioInput.isReadyForMoreMediaData && !(self?.isCancelled ?? true) {
                    if let sampleBuffer = audioOutput.copyNextSampleBuffer() {
                        audioInput.append(sampleBuffer)
                    } else {
                        audioInput.markAsFinished()
                        group.leave()
                        return
                    }
                }
            }
        }

        // Wait for completion
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            group.notify(queue: .main) {
                continuation.resume()
            }
        }

        print("VideoCompositor: Frame generation complete, \(framesWritten) frames")

        if let error = videoError {
            throw error
        }

        // Finish writing
        await writer.finishWriting()

        if writer.status == .failed {
            throw writer.error ?? NSError(domain: "VideoCompositor", code: -3, userInfo: [NSLocalizedDescriptionKey: "Export failed"])
        }

        print("VideoCompositor: Export complete to \(outputURL.path)")
    }

    /// Create composite frame synchronously (called from dispatch queue)
    private func createCompositeFrameSync(
        timeSec: Double,
        config: CompositorConfig,
        outputSize: CGSize,
        ciContext: CIContext,
        adaptor: AVAssetWriterInputPixelBufferAdaptor,
        videoSources: [VideoClipSource]
    ) -> CVPixelBuffer? {
        // Get pixel buffer from pool
        guard let pool = adaptor.pixelBufferPool else {
            return nil
        }
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }

        // Create background
        var outputImage = createSimpleBackground(config.background, size: outputSize)

        // Sort clips by z-index
        let sortedClips = config.clips.sorted { $0.zIndex < $1.zIndex }

        // Composite each clip
        for clip in sortedClips {
            let clipStartSec = Double(clip.startTimeMs) / 1000.0
            let clipEndSec = clipStartSec + Double(clip.durationMs) / 1000.0

            guard timeSec >= clipStartSec && timeSec < clipEndSec else {
                continue
            }

            var clipImage: CIImage?

            if clip.sourceType == .video {
                // Find the source for this clip
                if let source = videoSources.first(where: { $0.clip.sourcePath == clip.sourcePath && $0.isActive(at: timeSec) }) {
                    let sourceTime = source.getSourceTime(at: timeSec)
                    do {
                        let cgImage = try source.imageGenerator.copyCGImage(at: sourceTime, actualTime: nil)
                        clipImage = CIImage(cgImage: cgImage)
                    } catch {
                        // Frame not available, skip
                    }
                }
            } else if clip.sourceType == .image {
                if let nsImage = NSImage(contentsOfFile: clip.sourcePath),
                   let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) {
                    clipImage = CIImage(cgImage: cgImage)
                }
            }

            guard var image = clipImage else { continue }

            // Apply crop if needed
            // UI coordinates: cropTop removes from top of image, cropBottom from bottom
            // Core Image: Y=0 is at bottom, so we need to map:
            //   - UI cropBottom → CI crop starts at Y = extent.height * cropBottom (from bottom)
            //   - UI cropTop → CI crop ends at Y = extent.height * (1 - cropTop)
            let cropTop = CGFloat(clip.cropTop ?? 0) / 100.0
            let cropBottom = CGFloat(clip.cropBottom ?? 0) / 100.0
            let cropLeft = CGFloat(clip.cropLeft ?? 0) / 100.0
            let cropRight = CGFloat(clip.cropRight ?? 0) / 100.0

            if cropTop > 0 || cropBottom > 0 || cropLeft > 0 || cropRight > 0 {
                let extent = image.extent
                let x = extent.width * cropLeft
                let y = extent.height * cropBottom  // Start from bottom, skip cropBottom portion
                let width = extent.width * (1 - cropLeft - cropRight)
                let height = extent.height * (1 - cropTop - cropBottom)
                image = image.cropped(to: CGRect(x: x, y: y, width: width, height: height))
                    .transformed(by: CGAffineTransform(translationX: -x, y: -y))
            }

            // Apply corner radius if needed
            if let cornerRadius = clip.cornerRadius, cornerRadius > 0 {
                image = applyCornerRadiusToImage(image, radius: CGFloat(cornerRadius))
            }

            // Apply per-clip pan effects (before scaling/positioning)
            if let panClips = config.panClips {
                image = applyPanToClip(image: image, clip: clip, panClips: panClips, timeSec: timeSec)
            }

            // Apply per-clip zoom effects (before scaling/positioning)
            if let zoomClips = config.zoomClips {
                image = applyZoomToClip(image: image, clip: clip, zoomClips: zoomClips, timeSec: timeSec)
            }

            // Apply scale
            let scale = clip.scale ?? 0.8
            let scaledWidth = outputSize.width * CGFloat(scale)
            let scaledHeight = outputSize.height * CGFloat(scale)
            let scaleX = scaledWidth / image.extent.width
            let scaleY = scaledHeight / image.extent.height
            let scaleFactor = min(scaleX, scaleY)
            image = image.transformed(by: CGAffineTransform(scaleX: scaleFactor, y: scaleFactor))

            // Position (flip Y coordinate: Core Image origin is bottom-left, UI/FFmpeg origin is top-left)
            let posX = clip.positionX ?? (outputSize.width / 2)
            let posY = clip.positionY ?? (outputSize.height / 2)
            let flippedY = outputSize.height - CGFloat(posY) // Flip Y coordinate
            let offsetX = CGFloat(posX) - image.extent.width / 2
            let offsetY = flippedY - image.extent.height / 2
            image = image.transformed(by: CGAffineTransform(translationX: offsetX, y: offsetY))

            // Apply opacity
            if let opacity = clip.opacity, opacity < 1.0 {
                image = image.applyingFilter("CIColorMatrix", parameters: [
                    "inputAVector": CIVector(x: 0, y: 0, z: 0, w: CGFloat(opacity))
                ])
            }

            outputImage = image.composited(over: outputImage)
        }

        // Apply blur effects
        if let blurClips = config.blurClips {
            outputImage = applyBlurEffectsSimple(to: outputImage, blurClips: blurClips, timeSec: timeSec, outputSize: outputSize)
        }

        // Render to pixel buffer
        ciContext.render(outputImage, to: buffer)

        return buffer
    }

    private func applyCornerRadiusToImage(_ image: CIImage, radius: CGFloat) -> CIImage {
        let extent = image.extent

        guard let roundedRectGenerator = CIFilter(name: "CIRoundedRectangleGenerator") else {
            return image
        }

        roundedRectGenerator.setValue(CIVector(cgRect: extent), forKey: "inputExtent")
        roundedRectGenerator.setValue(radius, forKey: "inputRadius")
        roundedRectGenerator.setValue(CIColor.white, forKey: "inputColor")

        guard let mask = roundedRectGenerator.outputImage else {
            return image
        }

        guard let blendFilter = CIFilter(name: "CIBlendWithMask") else {
            return image
        }

        let transparent = CIImage(color: CIColor.clear).cropped(to: extent)

        blendFilter.setValue(image, forKey: kCIInputImageKey)
        blendFilter.setValue(transparent, forKey: kCIInputBackgroundImageKey)
        blendFilter.setValue(mask, forKey: kCIInputMaskImageKey)

        return blendFilter.outputImage ?? image
    }

    private func easeInOutQuadValue(_ t: Double) -> Double {
        if t < 0.5 {
            return 2 * t * t
        } else {
            return 1 - pow(-2 * t + 2, 2) / 2
        }
    }

    private func applyZoomEffects(to image: CIImage, zoomClips: [CompositorZoomClip], timeSec: Double, outputSize: CGSize) -> CIImage {
        var resultImage = image

        for zoom in zoomClips {
            let zoomStartSec = Double(zoom.startTimeMs) / 1000.0
            let zoomEndSec = zoomStartSec + Double(zoom.durationMs) / 1000.0

            guard timeSec >= zoomStartSec && timeSec < zoomEndSec else { continue }

            let easeInSec = Double(zoom.easeInDurationMs) / 1000.0
            let easeOutSec = Double(zoom.easeOutDurationMs) / 1000.0

            var zoomFactor: Double = zoom.zoomScale

            if timeSec < zoomStartSec + easeInSec {
                let easeProgress = (timeSec - zoomStartSec) / easeInSec
                zoomFactor = 1.0 + (zoom.zoomScale - 1.0) * easeInOutQuadValue(easeProgress)
            } else if timeSec > zoomEndSec - easeOutSec {
                let easeProgress = (timeSec - (zoomEndSec - easeOutSec)) / easeOutSec
                zoomFactor = zoom.zoomScale - (zoom.zoomScale - 1.0) * easeInOutQuadValue(easeProgress)
            }

            // Center point as 0-1 ratio (flip Y for Core Image's bottom-left origin)
            let centerXRatio = CGFloat(zoom.zoomCenterX / 100.0)
            let centerYRatio = CGFloat((100.0 - zoom.zoomCenterY) / 100.0)

            // FFmpeg approach: scale up, then crop
            // After scaling by zf, image is zf times larger
            // We want to crop outputSize from scaled image
            // crop_x = scaled_width * (1 - 1/zoom) * center_x = outputSize.width * zf * (1 - 1/zf) * cx
            //        = outputSize.width * (zf - 1) * cx
            let zf = CGFloat(zoomFactor)

            // Scale the image
            resultImage = resultImage.transformed(by: CGAffineTransform(scaleX: zf, y: zf))

            // Calculate crop offset - how much extra space we have after scaling
            let extraWidth = outputSize.width * (zf - 1.0)
            let extraHeight = outputSize.height * (zf - 1.0)

            // Position crop based on center ratio
            let cropX = extraWidth * centerXRatio
            let cropY = extraHeight * centerYRatio

            let cropRect = CGRect(
                x: cropX,
                y: cropY,
                width: outputSize.width,
                height: outputSize.height
            )
            resultImage = resultImage.cropped(to: cropRect)
                .transformed(by: CGAffineTransform(translationX: -cropX, y: -cropY))
        }

        return resultImage
    }

    /// Apply pan effects to a specific clip image (per-track pan)
    private func applyPanToClip(image: CIImage, clip: CompositorClip, panClips: [CompositorPanClip], timeSec: Double) -> CIImage {
        guard let trackId = clip.trackId else { return image }

        var resultImage = image
        let imageSize = image.extent.size

        // Filter pan clips for this track and sort by z-index
        let relevantPans = panClips.filter { $0.targetTrackId == trackId }
            .sorted(by: { $0.zIndex < $1.zIndex })

        for pan in relevantPans {
            let panStartSec = Double(pan.startTimeMs) / 1000.0
            let panEndSec = panStartSec + Double(pan.durationMs) / 1000.0

            // Skip if not within pan time range
            guard timeSec >= panStartSec && timeSec < panEndSec else { continue }

            // Calculate progress with linear interpolation
            let progress = (timeSec - panStartSec) / (panEndSec - panStartSec)
            let currentX = pan.startX + (pan.endX - pan.startX) * progress
            let currentY = pan.startY + (pan.endY - pan.startY) * progress

            // Scale up and crop to create pan effect (same as FFmpeg: scale_factor = 1.5)
            let scaleFactor: CGFloat = 1.5
            resultImage = resultImage.transformed(by: CGAffineTransform(
                scaleX: scaleFactor, y: scaleFactor
            ))

            // Calculate max pan offset based on the clip's image size
            let maxOffsetX = imageSize.width * scaleFactor - imageSize.width
            let maxOffsetY = imageSize.height * scaleFactor - imageSize.height

            // Apple native coordinate formula:
            // X: position directly maps (0=left, 100=right)
            // Y: inverted because Core Image has bottom-left origin but user expects top-left
            //    (0=top -> maxOffset, 100=bottom -> 0)
            let offsetX = CGFloat(currentX / 100.0) * maxOffsetX
            let offsetY = CGFloat((100.0 - currentY) / 100.0) * maxOffsetY

            let cropRect = CGRect(x: offsetX, y: offsetY, width: imageSize.width, height: imageSize.height)
            resultImage = resultImage.cropped(to: cropRect)
                .transformed(by: CGAffineTransform(translationX: -offsetX, y: -offsetY))
        }

        return resultImage
    }

    /// Apply zoom effects to a specific clip image (per-track zoom)
    private func applyZoomToClip(image: CIImage, clip: CompositorClip, zoomClips: [CompositorZoomClip], timeSec: Double) -> CIImage {
        guard let trackId = clip.trackId else { return image }

        var resultImage = image

        // Filter zoom clips for this track
        let relevantZooms = zoomClips.filter { $0.targetTrackId == trackId }

        for zoom in relevantZooms {
            let zoomStartSec = Double(zoom.startTimeMs) / 1000.0
            let zoomEndSec = zoomStartSec + Double(zoom.durationMs) / 1000.0

            guard timeSec >= zoomStartSec && timeSec < zoomEndSec else { continue }

            let easeInSec = Double(zoom.easeInDurationMs) / 1000.0
            let easeOutSec = Double(zoom.easeOutDurationMs) / 1000.0

            var zoomFactor: Double = zoom.zoomScale

            if timeSec < zoomStartSec + easeInSec {
                let easeProgress = (timeSec - zoomStartSec) / easeInSec
                zoomFactor = 1.0 + (zoom.zoomScale - 1.0) * easeInOutQuadValue(easeProgress)
            } else if timeSec > zoomEndSec - easeOutSec {
                let easeProgress = (timeSec - (zoomEndSec - easeOutSec)) / easeOutSec
                zoomFactor = zoom.zoomScale - (zoom.zoomScale - 1.0) * easeInOutQuadValue(easeProgress)
            }

            let extent = resultImage.extent
            let imageWidth = extent.width
            let imageHeight = extent.height

            // Center ratios (0-1) - same as FFmpeg
            let centerXRatio = CGFloat(zoom.zoomCenterX / 100.0)
            // Flip Y for Core Image's bottom-left origin: UI y=0 is top, CI y=0 is bottom
            let centerYRatio = CGFloat((100.0 - zoom.zoomCenterY) / 100.0)

            // FFmpeg approach: scale up, then crop
            // 1. Scale the image (scaling happens from origin, so extent origin also scales)
            resultImage = resultImage.transformed(by: CGAffineTransform(
                scaleX: CGFloat(zoomFactor), y: CGFloat(zoomFactor)
            ))

            // 2. Calculate crop position
            // After scaling, the new extent origin is at (extent.origin.x * zoom, extent.origin.y * zoom)
            // The crop position is relative to the scaled image
            let scaledExtent = resultImage.extent
            let cropX = scaledExtent.origin.x + imageWidth * (CGFloat(zoomFactor) - 1) * centerXRatio
            let cropY = scaledExtent.origin.y + imageHeight * (CGFloat(zoomFactor) - 1) * centerYRatio

            // 3. Crop back to original size and translate to origin
            let cropRect = CGRect(x: cropX, y: cropY, width: imageWidth, height: imageHeight)
            resultImage = resultImage.cropped(to: cropRect)
                .transformed(by: CGAffineTransform(translationX: -cropRect.origin.x, y: -cropRect.origin.y))
        }

        return resultImage
    }

    private func applyBlurEffectsSimple(to image: CIImage, blurClips: [CompositorBlurClip], timeSec: Double, outputSize: CGSize) -> CIImage {
        var resultImage = image

        for blur in blurClips.sorted(by: { $0.zIndex < $1.zIndex }) {
            let blurStartSec = Double(blur.startTimeMs) / 1000.0
            let blurEndSec = blurStartSec + Double(blur.durationMs) / 1000.0

            guard timeSec >= blurStartSec && timeSec < blurEndSec else { continue }

            let regionX = outputSize.width * CGFloat(blur.regionX / 100.0)
            // Flip Y coordinate for Core Image's bottom-left origin
            let regionY = outputSize.height * (1.0 - CGFloat(blur.regionY / 100.0))
            let regionW = outputSize.width * CGFloat(blur.regionWidth / 100.0)
            let regionH = outputSize.height * CGFloat(blur.regionHeight / 100.0)

            let blurRect = CGRect(
                x: regionX - regionW / 2,
                y: regionY - regionH / 2,
                width: regionW,
                height: regionH
            )

            let regionImage = resultImage.cropped(to: blurRect)

            guard let blurFilter = CIFilter(name: "CIGaussianBlur") else { continue }
            blurFilter.setValue(regionImage, forKey: kCIInputImageKey)
            blurFilter.setValue(blur.blurIntensity * 0.5, forKey: kCIInputRadiusKey)

            guard let blurredRegion = blurFilter.outputImage?.cropped(to: blurRect) else { continue }

            resultImage = blurredRegion.composited(over: resultImage)
        }

        return resultImage
    }

    /// Export by directly generating frames (for compositions without video source tracks)
    private func exportWithDirectGeneration(
        outputURL: URL,
        config: CompositorConfig,
        audioComposition: AVComposition?
    ) async throws {
        // Create asset writer
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

        // Video settings
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: config.width,
            AVVideoHeightKey: config.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: bitrateForQuality(config.quality, width: config.width, height: config.height),
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoAllowFrameReorderingKey: false,
                AVVideoExpectedSourceFrameRateKey: config.frameRate
            ]
        ]

        let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoInput.expectsMediaDataInRealTime = false
        writer.add(videoInput)

        // Create pixel buffer adaptor for generating frames
        let pixelBufferAttributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: config.width,
            kCVPixelBufferHeightKey as String: config.height,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: videoInput,
            sourcePixelBufferAttributes: pixelBufferAttributes
        )

        // Audio setup if needed
        var audioInput: AVAssetWriterInput? = nil
        var audioOutput: AVAssetReaderAudioMixOutput? = nil
        var audioReader: AVAssetReader? = nil

        if let audioComp = audioComposition {
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 48000,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 320000
            ]
            let ai = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            ai.expectsMediaDataInRealTime = false
            writer.add(ai)
            audioInput = ai

            let reader = try AVAssetReader(asset: audioComp)
            let ao = AVAssetReaderAudioMixOutput(audioTracks: audioComp.tracks(withMediaType: .audio), audioSettings: nil)
            reader.add(ao)
            audioOutput = ao
            audioReader = reader
        }

        // Start writing
        writer.startWriting()
        writer.startSession(atSourceTime: .zero)
        audioReader?.startReading()

        // Create Core Image context for rendering
        let ciContext: CIContext
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            ciContext = CIContext(mtlDevice: metalDevice)
        } else {
            ciContext = CIContext()
        }

        let totalFrames = Int64(config.durationMs) * Int64(config.frameRate) / 1000
        let frameDuration = CMTime(value: 1, timescale: CMTimeScale(config.frameRate))
        let outputSize = CGSize(width: config.width, height: config.height)

        // Generate frames
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            let queue = DispatchQueue(label: "video.compositor.generate")
            var framesWritten: Int64 = 0
            var hasResumed = false

            videoInput.requestMediaDataWhenReady(on: queue) { [weak self] in
                guard let self = self else {
                    if !hasResumed {
                        hasResumed = true
                        videoInput.markAsFinished()
                        continuation.resume()
                    }
                    return
                }

                while videoInput.isReadyForMoreMediaData && !self.isCancelled && framesWritten < totalFrames {
                    let presentationTime = CMTimeMultiply(frameDuration, multiplier: Int32(framesWritten))

                    // Create frame
                    guard let pixelBuffer = self.createFramePixelBuffer(
                        time: presentationTime,
                        config: config,
                        outputSize: outputSize,
                        ciContext: ciContext,
                        adaptor: adaptor
                    ) else {
                        print("VideoCompositor: Failed to create frame at \(framesWritten)")
                        framesWritten += 1
                        continue
                    }

                    if !adaptor.append(pixelBuffer, withPresentationTime: presentationTime) {
                        print("VideoCompositor: Failed to append frame: \(writer.error?.localizedDescription ?? "unknown")")
                    }

                    framesWritten += 1
                    self.progressCallback?(Float(framesWritten) / Float(totalFrames), framesWritten, totalFrames)
                }

                if framesWritten >= totalFrames || self.isCancelled {
                    if !hasResumed {
                        hasResumed = true
                        videoInput.markAsFinished()
                        continuation.resume()
                    }
                }
            }
        }

        // Process audio if present
        if let audioInput = audioInput, let audioOutput = audioOutput {
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                let queue = DispatchQueue(label: "video.compositor.audio")
                var hasResumed = false

                audioInput.requestMediaDataWhenReady(on: queue) { [weak self] in
                    while audioInput.isReadyForMoreMediaData && !(self?.isCancelled ?? true) {
                        if let sampleBuffer = audioOutput.copyNextSampleBuffer() {
                            audioInput.append(sampleBuffer)
                        } else {
                            if !hasResumed {
                                hasResumed = true
                                audioInput.markAsFinished()
                                continuation.resume()
                            }
                            return
                        }
                    }
                }
            }
        }

        await writer.finishWriting()

        if writer.status == .failed {
            throw writer.error ?? NSError(domain: "VideoCompositor", code: -3, userInfo: [NSLocalizedDescriptionKey: "Export failed"])
        }
    }

    /// Create a single frame pixel buffer
    private func createFramePixelBuffer(
        time: CMTime,
        config: CompositorConfig,
        outputSize: CGSize,
        ciContext: CIContext,
        adaptor: AVAssetWriterInputPixelBufferAdaptor
    ) -> CVPixelBuffer? {
        // Get pixel buffer from pool
        guard let pool = adaptor.pixelBufferPool else { return nil }
        var pixelBuffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
        guard let buffer = pixelBuffer else { return nil }

        // Create background image
        var outputImage = createSimpleBackground(config.background, size: outputSize)

        // Add image clips
        let currentSec = CMTimeGetSeconds(time)
        for clip in config.clips where clip.sourceType == .image {
            let clipStartSec = Double(clip.startTimeMs) / 1000.0
            let clipEndSec = clipStartSec + Double(clip.durationMs) / 1000.0

            guard currentSec >= clipStartSec && currentSec < clipEndSec else { continue }

            // Load image
            guard let nsImage = NSImage(contentsOfFile: clip.sourcePath),
                  let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
                continue
            }

            var clipImage = CIImage(cgImage: cgImage)

            // Apply scale
            let scale = clip.scale ?? 0.8
            let scaledWidth = outputSize.width * CGFloat(scale)
            let scaledHeight = outputSize.height * CGFloat(scale)
            let scaleX = scaledWidth / clipImage.extent.width
            let scaleY = scaledHeight / clipImage.extent.height
            let scaleFactor = min(scaleX, scaleY)
            clipImage = clipImage.transformed(by: CGAffineTransform(scaleX: scaleFactor, y: scaleFactor))

            // Position
            let posX = clip.positionX ?? (outputSize.width / 2)
            let posY = clip.positionY ?? (outputSize.height / 2)
            let offsetX = CGFloat(posX) - clipImage.extent.width / 2
            let offsetY = CGFloat(posY) - clipImage.extent.height / 2
            clipImage = clipImage.transformed(by: CGAffineTransform(translationX: offsetX, y: offsetY))

            // Apply opacity
            if let opacity = clip.opacity, opacity < 1.0 {
                clipImage = clipImage.applyingFilter("CIColorMatrix", parameters: [
                    "inputAVector": CIVector(x: 0, y: 0, z: 0, w: CGFloat(opacity))
                ])
            }

            outputImage = clipImage.composited(over: outputImage)
        }

        // Render to pixel buffer
        let outputRect = CGRect(origin: .zero, size: outputSize)
        outputImage = outputImage.cropped(to: outputRect)
        ciContext.render(outputImage, to: buffer, bounds: outputRect, colorSpace: CGColorSpaceCreateDeviceRGB())

        return buffer
    }

    /// Simple background creator for direct generation
    private func createSimpleBackground(_ background: CompositorBackground?, size: CGSize) -> CIImage {
        guard let bg = background else {
            return CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                .cropped(to: CGRect(origin: .zero, size: size))
        }

        switch bg.backgroundType {
        case .solid:
            let color = parseHexColor(bg.color ?? "#1a1a2e")
            return CIImage(color: color).cropped(to: CGRect(origin: .zero, size: size))

        case .gradient:
            return createGradientBackground(
                stops: bg.gradientStops ?? [
                    GradientStop(color: "#1a1a2e", position: 0),
                    GradientStop(color: "#2d2d44", position: 1)
                ],
                angle: bg.gradientAngle ?? 180,
                size: size
            )

        case .image:
            if let imagePath = bg.mediaPath ?? bg.imageUrl,
               let nsImage = NSImage(contentsOfFile: imagePath),
               let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) {
                var image = CIImage(cgImage: cgImage)
                let scaleX = size.width / image.extent.width
                let scaleY = size.height / image.extent.height
                let scale = max(scaleX, scaleY)
                image = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
                let offsetX = (image.extent.width - size.width) / 2
                let offsetY = (image.extent.height - size.height) / 2
                return image.cropped(to: CGRect(x: offsetX, y: offsetY, width: size.width, height: size.height))
                    .transformed(by: CGAffineTransform(translationX: -offsetX, y: -offsetY))
            }
            return CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                .cropped(to: CGRect(origin: .zero, size: size))
        }
    }

    private func parseHexColor(_ hex: String) -> CIColor {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0
        return CIColor(red: r, green: g, blue: b)
    }

    private func createGradientBackground(stops: [GradientStop], angle: Int, size: CGSize) -> CIImage {
        guard stops.count >= 2 else {
            return CIImage(color: CIColor(red: 0.1, green: 0.1, blue: 0.18))
                .cropped(to: CGRect(origin: .zero, size: size))
        }

        let color0 = parseHexColor(stops.first!.color)
        let color1 = parseHexColor(stops.last!.color)

        let angleRad = CGFloat(angle) * .pi / 180.0
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let radius = sqrt(size.width * size.width + size.height * size.height) / 2

        let startPoint = CGPoint(
            x: center.x - cos(angleRad) * radius,
            y: center.y - sin(angleRad) * radius
        )
        let endPoint = CGPoint(
            x: center.x + cos(angleRad) * radius,
            y: center.y + sin(angleRad) * radius
        )

        guard let gradient = CIFilter(name: "CILinearGradient") else {
            return CIImage(color: color0).cropped(to: CGRect(origin: .zero, size: size))
        }

        gradient.setValue(CIVector(cgPoint: startPoint), forKey: "inputPoint0")
        gradient.setValue(CIVector(cgPoint: endPoint), forKey: "inputPoint1")
        gradient.setValue(color0, forKey: "inputColor0")
        gradient.setValue(color1, forKey: "inputColor1")

        return gradient.outputImage?.cropped(to: CGRect(origin: .zero, size: size)) ??
            CIImage(color: color0).cropped(to: CGRect(origin: .zero, size: size))
    }

    private func exportWithAssetWriter(
        composition: AVComposition,
        videoComposition: AVVideoComposition,
        outputURL: URL,
        config: CompositorConfig
    ) async throws {
        // Create asset writer
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

        // Video settings - use VideoToolbox for hardware acceleration
        let videoSettings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: config.width,
            AVVideoHeightKey: config.height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: bitrateForQuality(config.quality, width: config.width, height: config.height),
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                AVVideoAllowFrameReorderingKey: false, // Faster encoding
                AVVideoExpectedSourceFrameRateKey: config.frameRate
            ]
        ]

        let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
        videoInput.expectsMediaDataInRealTime = false
        writer.add(videoInput)

        // Audio settings
        let audioSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 48000,
            AVNumberOfChannelsKey: 2,
            AVEncoderBitRateKey: 320000
        ]

        let audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
        audioInput.expectsMediaDataInRealTime = false
        writer.add(audioInput)

        // Create reader
        let reader = try AVAssetReader(asset: composition)

        // Video reader output with composition
        let videoOutput = AVAssetReaderVideoCompositionOutput(
            videoTracks: composition.tracks(withMediaType: .video),
            videoSettings: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
        )
        videoOutput.videoComposition = videoComposition
        reader.add(videoOutput)

        // Audio reader output
        let audioTracks = composition.tracks(withMediaType: .audio)
        var audioOutput: AVAssetReaderAudioMixOutput? = nil
        if !audioTracks.isEmpty {
            audioOutput = AVAssetReaderAudioMixOutput(audioTracks: audioTracks, audioSettings: nil)
            reader.add(audioOutput!)
        }

        // Start reading and writing
        writer.startWriting()
        reader.startReading()
        writer.startSession(atSourceTime: .zero)

        let totalFrames = Int64(config.durationMs) * Int64(config.frameRate) / 1000
        var framesWritten: Int64 = 0

        // Process video with proper error handling
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            let videoQueue = DispatchQueue(label: "video.compositor.video")
            var hasResumed = false

            videoInput.requestMediaDataWhenReady(on: videoQueue) { [weak self] in
                guard let self = self else {
                    if !hasResumed {
                        hasResumed = true
                        videoInput.markAsFinished()
                        continuation.resume()
                    }
                    return
                }

                // Check reader status
                if reader.status == .failed {
                    print("VideoCompositor: Reader failed: \(reader.error?.localizedDescription ?? "unknown")")
                    if !hasResumed {
                        hasResumed = true
                        videoInput.markAsFinished()
                        continuation.resume()
                    }
                    return
                }

                if reader.status == .cancelled {
                    print("VideoCompositor: Reader cancelled")
                    if !hasResumed {
                        hasResumed = true
                        videoInput.markAsFinished()
                        continuation.resume()
                    }
                    return
                }

                while videoInput.isReadyForMoreMediaData && !self.isCancelled {
                    if let sampleBuffer = videoOutput.copyNextSampleBuffer() {
                        if !videoInput.append(sampleBuffer) {
                            print("VideoCompositor: Failed to append sample buffer: \(writer.error?.localizedDescription ?? "unknown")")
                            if !hasResumed {
                                hasResumed = true
                                videoInput.markAsFinished()
                                continuation.resume()
                            }
                            return
                        }
                        framesWritten += 1

                        // Report progress
                        let percent = Float(framesWritten) / Float(totalFrames)
                        self.progressCallback?(min(percent, 1.0), framesWritten, totalFrames)
                    } else {
                        // No more samples - check if it's end of file or an error
                        if reader.status == .completed || reader.status == .reading {
                            // Normal end
                            print("VideoCompositor: Video processing complete, \(framesWritten) frames written")
                        } else {
                            print("VideoCompositor: No sample buffer, reader status: \(reader.status.rawValue), error: \(reader.error?.localizedDescription ?? "none")")
                        }
                        if !hasResumed {
                            hasResumed = true
                            videoInput.markAsFinished()
                            continuation.resume()
                        }
                        return
                    }
                }

                if self.isCancelled && !hasResumed {
                    hasResumed = true
                    videoInput.markAsFinished()
                    continuation.resume()
                }
            }
        }

        // Process audio
        if let audioOutput = audioOutput {
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                let audioQueue = DispatchQueue(label: "video.compositor.audio")

                audioInput.requestMediaDataWhenReady(on: audioQueue) { [weak self] in
                    while audioInput.isReadyForMoreMediaData && !self!.isCancelled {
                        if let sampleBuffer = audioOutput.copyNextSampleBuffer() {
                            audioInput.append(sampleBuffer)
                        } else {
                            audioInput.markAsFinished()
                            continuation.resume()
                            return
                        }
                    }

                    if self!.isCancelled {
                        audioInput.markAsFinished()
                        continuation.resume()
                    }
                }
            }
        } else {
            audioInput.markAsFinished()
        }

        // Finish writing
        await writer.finishWriting()

        if writer.status == .failed {
            throw writer.error ?? NSError(domain: "VideoCompositor", code: -3, userInfo: [NSLocalizedDescriptionKey: "Export failed"])
        }
    }

    private func bitrateForQuality(_ quality: CompositorQuality, width: Int, height: Int) -> Int {
        let pixels = width * height
        let is4K = pixels >= 3840 * 2160
        let is1440p = pixels >= 2560 * 1440 && !is4K
        let multiplier = is4K ? 4 : (is1440p ? 2 : 1)

        switch quality {
        case .draft: return 2_000_000 * multiplier
        case .good: return 12_000_000 * multiplier
        case .high: return 25_000_000 * multiplier
        case .max: return 50_000_000 * multiplier
        }
    }

    func cancel() {
        isCancelled = true
    }
}

// MARK: - C API

private var globalCompositorEngine: VideoCompositorEngine?
private let compositorLock = NSLock()

/// Progress callback from C
public typealias CProgressCallback = @convention(c) (UnsafePointer<CChar>?, Float, Int64, Int64) -> Void

/// Completion callback from C
public typealias CCompletionCallback = @convention(c) (UnsafePointer<CChar>?, Int32, UnsafePointer<CChar>?) -> Void

/// Start a video composition render
/// Returns 0 on success, error code on failure
@_cdecl("taka_compositor_render")
public func takaCompositorRender(
    _ exportId: UnsafePointer<CChar>?,
    _ configJson: UnsafePointer<CChar>?,
    _ progressCallback: CProgressCallback?
) -> Int32 {
    guard #available(macOS 12.0, *) else {
        return 2 // TAKA_ERROR_INVALID_CONFIG
    }

    guard let configJson = configJson else {
        return 2
    }

    let exportIdString = exportId.map { String(cString: $0) } ?? UUID().uuidString
    let configString = String(cString: configJson)

    guard let configData = configString.data(using: .utf8),
          let config = try? JSONDecoder().decode(CompositorConfig.self, from: configData) else {
        print("VideoCompositor: Failed to parse config JSON")
        return 2
    }

    compositorLock.lock()
    let engine = VideoCompositorEngine()
    globalCompositorEngine = engine
    compositorLock.unlock()

    var result: Int32 = 0
    let semaphore = DispatchSemaphore(value: 0)

    Task {
        do {
            _ = try await engine.render(config: config) { percent, current, total in
                progressCallback?(exportIdString, percent, current, total)
            }
            result = 0
        } catch {
            print("VideoCompositor: Render failed: \(error)")
            result = 3 // TAKA_ERROR_RECORDING_FAILED
        }

        compositorLock.lock()
        globalCompositorEngine = nil
        compositorLock.unlock()

        semaphore.signal()
    }

    semaphore.wait()
    return result
}

/// Start a video composition render asynchronously
/// Returns immediately, use progress callback to track status
@_cdecl("taka_compositor_render_async")
public func takaCompositorRenderAsync(
    _ exportId: UnsafePointer<CChar>?,
    _ configJson: UnsafePointer<CChar>?,
    _ progressCallback: CProgressCallback?,
    _ completionCallback: CCompletionCallback?
) -> Int32 {
    guard #available(macOS 12.0, *) else {
        return 2
    }

    guard let configJson = configJson else {
        return 2
    }

    let exportIdString = exportId.map { String(cString: $0) } ?? UUID().uuidString
    let configString = String(cString: configJson)

    guard let configData = configString.data(using: .utf8),
          let config = try? JSONDecoder().decode(CompositorConfig.self, from: configData) else {
        print("VideoCompositor: Failed to parse config JSON")
        return 2
    }

    compositorLock.lock()
    let engine = VideoCompositorEngine()
    globalCompositorEngine = engine
    compositorLock.unlock()

    Task {
        do {
            let outputPath = try await engine.render(config: config) { percent, current, total in
                progressCallback?(exportIdString, percent, current, total)
            }
            completionCallback?(exportIdString, 0, outputPath)
        } catch {
            print("VideoCompositor: Render failed: \(error)")
            let errorMsg = error.localizedDescription
            completionCallback?(exportIdString, 3, errorMsg)
        }

        compositorLock.lock()
        globalCompositorEngine = nil
        compositorLock.unlock()
    }

    return 0
}

/// Cancel an in-progress render
@_cdecl("taka_compositor_cancel")
public func takaCompositorCancel() {
    compositorLock.lock()
    globalCompositorEngine?.cancel()
    globalCompositorEngine = nil
    compositorLock.unlock()
}
