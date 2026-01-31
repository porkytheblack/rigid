// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RigidCaptureKit",
    platforms: [.macOS(.v12)],  // ScreenCaptureKit requires macOS 12.3+
    products: [
        .library(
            name: "RigidCaptureKit",
            type: .static,
            targets: ["RigidCaptureKit"]
        )
    ],
    targets: [
        .target(
            name: "RigidCaptureKit",
            dependencies: [],
            path: "Sources/RigidCaptureKit",
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
