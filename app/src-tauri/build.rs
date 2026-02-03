fn main() {
    // Build Swift library on macOS
    #[cfg(target_os = "macos")]
    {
        build_swift_library();
    }

    tauri_build::build()
}

#[cfg(target_os = "macos")]
fn build_swift_library() {
    use std::env;
    use std::path::PathBuf;
    use std::process::Command;

    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let swift_dir = manifest_dir.join("swift");

    // Check if swift directory exists
    if !swift_dir.exists() {
        println!("cargo:warning=Swift directory not found, skipping Swift build");
        return;
    }

    // Determine build configuration
    let profile = env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let configuration = if profile == "release" {
        "release"
    } else {
        "debug"
    };

    // Get the target architecture for cross-compilation support
    let arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_else(|_| "aarch64".to_string());
    let swift_arch = match arch.as_str() {
        "x86_64" => "x86_64",
        "aarch64" => "arm64",
        _ => "arm64",
    };

    // Determine the Swift triple for cross-compilation
    let swift_triple = match arch.as_str() {
        "x86_64" => "x86_64-apple-macosx",
        "aarch64" => "arm64-apple-macosx",
        _ => "arm64-apple-macosx",
    };

    println!("cargo:warning=Building Swift package in {} mode for {}...", configuration, swift_triple);

    // Build Swift package with explicit triple for cross-compilation
    let status = Command::new("swift")
        .args([
            "build",
            "-c", configuration,
            "--package-path", swift_dir.to_str().unwrap(),
            "--triple", swift_triple,
        ])
        .status()
        .expect("Failed to execute swift build command");

    if !status.success() {
        panic!("Swift build failed with status: {}", status);
    }

    // Get the built library path
    // Swift builds to .build/<arch>-apple-macosx/<configuration>/
    let swift_build_dir = swift_dir
        .join(".build")
        .join(format!("{}-apple-macosx", swift_arch))
        .join(configuration);

    // Also try the simpler path structure
    let alt_swift_build_dir = swift_dir.join(".build").join(configuration);

    let lib_path = if swift_build_dir.join("libRigidCaptureKit.a").exists() {
        swift_build_dir
    } else if alt_swift_build_dir.join("libRigidCaptureKit.a").exists() {
        alt_swift_build_dir
    } else {
        // Try to find the library
        let output = Command::new("find")
            .args([
                swift_dir.join(".build").to_str().unwrap(),
                "-name",
                "libRigidCaptureKit.a",
                "-type",
                "f",
            ])
            .output()
            .expect("Failed to find library");

        let found_path = String::from_utf8_lossy(&output.stdout);
        if let Some(path) = found_path.lines().next() {
            PathBuf::from(path).parent().unwrap().to_path_buf()
        } else {
            panic!(
                "Could not find libRigidCaptureKit.a in {:?}",
                swift_dir.join(".build")
            );
        }
    };

    println!("cargo:warning=Found Swift library at: {:?}", lib_path);

    // Link the Swift library
    println!("cargo:rustc-link-search=native={}", lib_path.display());
    println!("cargo:rustc-link-lib=static=RigidCaptureKit");

    // Link required macOS frameworks
    println!("cargo:rustc-link-lib=framework=ScreenCaptureKit");
    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=CoreMedia");
    println!("cargo:rustc-link-lib=framework=CoreVideo");
    println!("cargo:rustc-link-lib=framework=VideoToolbox");
    println!("cargo:rustc-link-lib=framework=CoreGraphics");
    println!("cargo:rustc-link-lib=framework=AppKit");
    println!("cargo:rustc-link-lib=framework=Foundation");

    // Link Swift runtime libraries
    // Get the Swift library path
    let swift_lib_output = Command::new("xcrun")
        .args(["--show-sdk-path"])
        .output()
        .expect("Failed to get SDK path");

    let sdk_path = String::from_utf8_lossy(&swift_lib_output.stdout)
        .trim()
        .to_string();

    // Link against the Swift runtime
    let toolchain_output = Command::new("xcrun")
        .args(["--find", "swift"])
        .output()
        .expect("Failed to find swift");

    let swift_path = String::from_utf8_lossy(&toolchain_output.stdout)
        .trim()
        .to_string();

    if let Some(toolchain_lib) = PathBuf::from(&swift_path)
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join("lib").join("swift").join("macosx"))
    {
        if toolchain_lib.exists() {
            println!("cargo:rustc-link-search=native={}", toolchain_lib.display());
            // Add rpath for Swift runtime libraries at runtime
            println!(
                "cargo:rustc-link-arg=-Wl,-rpath,{}",
                toolchain_lib.display()
            );
        }
    }

    // Also add the Xcode toolchain lib path for Swift Concurrency
    let xcode_swift_lib_output = Command::new("xcrun")
        .args(["--toolchain", "default", "--find", "swift"])
        .output();

    if let Ok(output) = xcode_swift_lib_output {
        let xcode_swift_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if let Some(xcode_toolchain_lib) = PathBuf::from(&xcode_swift_path)
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("lib").join("swift").join("macosx"))
        {
            if xcode_toolchain_lib.exists() {
                println!(
                    "cargo:rustc-link-search=native={}",
                    xcode_toolchain_lib.display()
                );
                println!(
                    "cargo:rustc-link-arg=-Wl,-rpath,{}",
                    xcode_toolchain_lib.display()
                );
            }
        }
    }

    // Add /usr/lib/swift as a runtime path - this is where system Swift libs live
    println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");

    // Also add the usr/lib/swift path
    let usr_lib_swift = PathBuf::from(&sdk_path)
        .parent()
        .unwrap_or(&PathBuf::from("/"))
        .join("usr")
        .join("lib")
        .join("swift");
    if usr_lib_swift.exists() {
        println!("cargo:rustc-link-search=native={}", usr_lib_swift.display());
    }

    // Rebuild if Swift sources change
    println!("cargo:rerun-if-changed=swift/Package.swift");
    println!("cargo:rerun-if-changed=swift/Sources/");
}
