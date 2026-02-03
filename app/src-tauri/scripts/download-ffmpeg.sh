#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BINARIES_DIR="$SCRIPT_DIR/../binaries"
mkdir -p "$BINARIES_DIR"

# URLs for static FFmpeg builds
# macOS from Martin-Riedl's FFmpeg build server
# Windows from gyan.dev

download_macos() {
    local arch=$1
    local target_triple=$2
    echo "Downloading FFmpeg for macOS $arch..."

    # Download ffmpeg
    curl -L "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$arch/release/ffmpeg.zip" -o /tmp/ffmpeg.zip
    unzip -o /tmp/ffmpeg.zip -d /tmp/ffmpeg-extract
    # Find the ffmpeg binary (might be in a subdirectory)
    local ffmpeg_bin=$(find /tmp/ffmpeg-extract -name "ffmpeg" -type f | head -1)
    if [ -n "$ffmpeg_bin" ]; then
        mv "$ffmpeg_bin" "$BINARIES_DIR/ffmpeg-$target_triple"
        chmod +x "$BINARIES_DIR/ffmpeg-$target_triple"
        echo "Installed ffmpeg-$target_triple"
    else
        echo "Error: ffmpeg binary not found in archive"
        exit 1
    fi
    rm -rf /tmp/ffmpeg.zip /tmp/ffmpeg-extract

    # Download ffprobe
    curl -L "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$arch/release/ffprobe.zip" -o /tmp/ffprobe.zip
    unzip -o /tmp/ffprobe.zip -d /tmp/ffprobe-extract
    local ffprobe_bin=$(find /tmp/ffprobe-extract -name "ffprobe" -type f | head -1)
    if [ -n "$ffprobe_bin" ]; then
        mv "$ffprobe_bin" "$BINARIES_DIR/ffprobe-$target_triple"
        chmod +x "$BINARIES_DIR/ffprobe-$target_triple"
        echo "Installed ffprobe-$target_triple"
    else
        echo "Error: ffprobe binary not found in archive"
        exit 1
    fi
    rm -rf /tmp/ffprobe.zip /tmp/ffprobe-extract
}

download_windows() {
    echo "Downloading FFmpeg for Windows x64..."

    # Download from gyan.dev essentials build
    curl -L "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -o /tmp/ffmpeg-win.zip
    unzip -o /tmp/ffmpeg-win.zip -d /tmp/ffmpeg-win-extract

    # Find the bin directory
    local bin_dir=$(find /tmp/ffmpeg-win-extract -name "bin" -type d | head -1)
    if [ -n "$bin_dir" ]; then
        mv "$bin_dir/ffmpeg.exe" "$BINARIES_DIR/ffmpeg-x86_64-pc-windows-msvc.exe"
        mv "$bin_dir/ffprobe.exe" "$BINARIES_DIR/ffprobe-x86_64-pc-windows-msvc.exe"
        echo "Installed ffmpeg-x86_64-pc-windows-msvc.exe"
        echo "Installed ffprobe-x86_64-pc-windows-msvc.exe"
    else
        echo "Error: bin directory not found in Windows archive"
        exit 1
    fi
    rm -rf /tmp/ffmpeg-win.zip /tmp/ffmpeg-win-extract
}

download_linux() {
    echo "Downloading FFmpeg for Linux x64..."

    # Download from johnvansickle.com static builds
    curl -L "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o /tmp/ffmpeg-linux.tar.xz
    mkdir -p /tmp/ffmpeg-linux-extract
    tar -xf /tmp/ffmpeg-linux.tar.xz -C /tmp/ffmpeg-linux-extract

    # Find the ffmpeg binary
    local ffmpeg_bin=$(find /tmp/ffmpeg-linux-extract -name "ffmpeg" -type f | head -1)
    local ffprobe_bin=$(find /tmp/ffmpeg-linux-extract -name "ffprobe" -type f | head -1)

    if [ -n "$ffmpeg_bin" ] && [ -n "$ffprobe_bin" ]; then
        mv "$ffmpeg_bin" "$BINARIES_DIR/ffmpeg-x86_64-unknown-linux-gnu"
        mv "$ffprobe_bin" "$BINARIES_DIR/ffprobe-x86_64-unknown-linux-gnu"
        chmod +x "$BINARIES_DIR/ffmpeg-x86_64-unknown-linux-gnu"
        chmod +x "$BINARIES_DIR/ffprobe-x86_64-unknown-linux-gnu"
        echo "Installed ffmpeg-x86_64-unknown-linux-gnu"
        echo "Installed ffprobe-x86_64-unknown-linux-gnu"
    else
        echo "Error: FFmpeg binaries not found in Linux archive"
        exit 1
    fi
    rm -rf /tmp/ffmpeg-linux.tar.xz /tmp/ffmpeg-linux-extract
}

download_current_platform() {
    local os=$(uname -s)
    local arch=$(uname -m)

    case "$os" in
        Darwin)
            case "$arch" in
                arm64)
                    download_macos "arm64" "aarch64-apple-darwin"
                    ;;
                x86_64)
                    download_macos "amd64" "x86_64-apple-darwin"
                    ;;
                *)
                    echo "Unsupported macOS architecture: $arch"
                    exit 1
                    ;;
            esac
            ;;
        Linux)
            download_linux
            ;;
        MINGW*|MSYS*|CYGWIN*)
            download_windows
            ;;
        *)
            echo "Unsupported OS: $os"
            exit 1
            ;;
    esac
}

case "${1:-current}" in
    "macos-arm64")
        download_macos "arm64" "aarch64-apple-darwin"
        ;;
    "macos-x64")
        download_macos "amd64" "x86_64-apple-darwin"
        ;;
    "linux-x64")
        download_linux
        ;;
    "windows")
        download_windows
        ;;
    "all")
        download_macos "arm64" "aarch64-apple-darwin"
        download_macos "amd64" "x86_64-apple-darwin"
        download_linux
        download_windows
        ;;
    "current")
        download_current_platform
        ;;
    *)
        echo "Usage: $0 {macos-arm64|macos-x64|linux-x64|windows|all|current}"
        echo ""
        echo "Options:"
        echo "  macos-arm64  - Download for macOS Apple Silicon"
        echo "  macos-x64    - Download for macOS Intel"
        echo "  linux-x64    - Download for Linux x64"
        echo "  windows      - Download for Windows x64"
        echo "  all          - Download for all platforms"
        echo "  current      - Download for current platform (default)"
        exit 1
        ;;
esac

echo ""
echo "Done! Binaries downloaded to $BINARIES_DIR"
ls -la "$BINARIES_DIR"
