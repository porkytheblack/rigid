// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "TakaCaptureKit",
    platforms: [.macOS(.v12)],  // ScreenCaptureKit requires macOS 12.3+
    products: [
        .library(
            name: "TakaCaptureKit",
            type: .static,
            targets: ["TakaCaptureKit"]
        )
    ],
    targets: [
        .target(
            name: "TakaCaptureKit",
            dependencies: [],
            path: "Sources/TakaCaptureKit",
            publicHeadersPath: "include",
            linkerSettings: [
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("AVFoundation"),
                .linkedFramework("CoreMedia"),
                .linkedFramework("CoreVideo"),
                .linkedFramework("VideoToolbox"),
                .linkedFramework("CoreGraphics"),
                .linkedFramework("AppKit"),
            ]
        )
    ]
)
