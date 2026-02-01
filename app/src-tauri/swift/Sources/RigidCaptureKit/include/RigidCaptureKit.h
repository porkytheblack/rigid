#ifndef RIGID_CAPTURE_KIT_H
#define RIGID_CAPTURE_KIT_H

#include <stdint.h>
#include <stdbool.h>

// Error codes
typedef enum {
    RIGID_SUCCESS = 0,
    RIGID_ERROR_NOT_AUTHORIZED = 1,
    RIGID_ERROR_INVALID_CONFIG = 2,
    RIGID_ERROR_RECORDING_FAILED = 3,
    RIGID_ERROR_ENCODING_FAILED = 4,
    RIGID_ERROR_NO_RECORDING = 5,
    RIGID_ERROR_SCREENSHOT_FAILED = 6,
    RIGID_ERROR_WINDOW_NOT_FOUND = 7,
    RIGID_ERROR_DISPLAY_NOT_FOUND = 8,
} RigidErrorCode;

// Video codec options (passed as int32_t)
#define RIGID_CODEC_H264 0
#define RIGID_CODEC_HEVC 1
#define RIGID_CODEC_PRORES_422 2
#define RIGID_CODEC_PRORES_422_HQ 3

// Opaque handle to the capture engine
typedef void* RigidCaptureHandle;

// ============================================================================
// Lifecycle
// ============================================================================

// Create a new capture engine instance
RigidCaptureHandle rigid_capture_create(void);

// Destroy a capture engine instance
void rigid_capture_destroy(RigidCaptureHandle handle);

// ============================================================================
// Authorization
// ============================================================================

// Check if screen capture permission is granted
bool rigid_capture_check_permission(void);

// Request screen capture permission (opens system dialog)
void rigid_capture_request_permission(void);

// ============================================================================
// Window/Display enumeration (JSON-based for FFI simplicity)
// ============================================================================

// List all capturable windows as JSON array string
// Caller must free with rigid_free_string
// JSON format: [{"window_id":123, "title":"...", "owner_name":"...",
//                "x":0, "y":0, "width":800, "height":600, "backing_scale_factor":2.0}, ...]
char* rigid_capture_list_windows_json(void);

// List all displays as JSON array string
// Caller must free with rigid_free_string
// JSON format: [{"display_id":1, "name":"...", "width":1920, "height":1080,
//                "backing_scale_factor":2.0, "is_main":true}, ...]
char* rigid_capture_list_displays_json(void);

// Free a string allocated by the library
void rigid_free_string(char* str);

// ============================================================================
// Recording - Window
// ============================================================================

// Start recording a specific window
// Parameters passed individually for FFI compatibility
int32_t rigid_capture_start_window_recording(
    RigidCaptureHandle handle,
    uint32_t window_id,
    const char* output_path,
    uint32_t width,
    uint32_t height,
    uint32_t fps,
    uint32_t bitrate,
    uint32_t keyframe_interval,
    int32_t codec,
    bool capture_cursor,
    bool capture_audio,
    float scale_factor
);

// ============================================================================
// Recording - Display
// ============================================================================

// Start recording an entire display
int32_t rigid_capture_start_display_recording(
    RigidCaptureHandle handle,
    uint32_t display_id,
    const char* output_path,
    uint32_t width,
    uint32_t height,
    uint32_t fps,
    uint32_t bitrate,
    uint32_t keyframe_interval,
    int32_t codec,
    bool capture_cursor,
    bool capture_audio,
    float scale_factor
);

// ============================================================================
// Recording - Region
// ============================================================================

// Start recording a region of a display
int32_t rigid_capture_start_region_recording(
    RigidCaptureHandle handle,
    uint32_t display_id,
    int32_t x,
    int32_t y,
    int32_t width,
    int32_t height,
    const char* output_path,
    uint32_t fps,
    uint32_t bitrate,
    uint32_t keyframe_interval,
    int32_t codec,
    bool capture_cursor,
    bool capture_audio,
    float scale_factor
);

// ============================================================================
// Recording control
// ============================================================================

// Stop the current recording and finalize the file
int32_t rigid_capture_stop_recording(RigidCaptureHandle handle);

// Cancel the current recording and delete partial file
int32_t rigid_capture_cancel_recording(RigidCaptureHandle handle);

// Check if currently recording
bool rigid_capture_is_recording(RigidCaptureHandle handle);

// Get duration of current recording in milliseconds
int64_t rigid_capture_get_recording_duration_ms(RigidCaptureHandle handle);

// ============================================================================
// Screenshot - Window
// ============================================================================

// Capture a screenshot of a specific window
int32_t rigid_capture_screenshot_window(
    uint32_t window_id,
    const char* output_path,
    float scale_factor,
    bool capture_cursor
);

// ============================================================================
// Screenshot - Display
// ============================================================================

// Capture a screenshot of an entire display
int32_t rigid_capture_screenshot_display(
    uint32_t display_id,
    const char* output_path,
    float scale_factor,
    bool capture_cursor
);

// ============================================================================
// Screenshot - Region
// ============================================================================

// Capture a screenshot of a region
int32_t rigid_capture_screenshot_region(
    uint32_t display_id,
    int32_t x,
    int32_t y,
    int32_t width,
    int32_t height,
    const char* output_path,
    float scale_factor,
    bool capture_cursor
);

// ============================================================================
// Video Compositor
// ============================================================================

// Progress callback for compositor
// Parameters: export_id, percent (0-1), current_frame, total_frames
typedef void (*RigidCompositorProgressCallback)(const char* export_id, float percent, int64_t current_frame, int64_t total_frames);

// Completion callback for async compositor
// Parameters: export_id, error_code (0=success), output_path_or_error
typedef void (*RigidCompositorCompletionCallback)(const char* export_id, int32_t error_code, const char* output_path_or_error);

// Render a video composition synchronously
// config_json: JSON string containing CompositorConfig
// Returns 0 on success, error code on failure
int32_t rigid_compositor_render(
    const char* export_id,
    const char* config_json,
    RigidCompositorProgressCallback progress_callback
);

// Render a video composition asynchronously
// Returns immediately, calls completion callback when done
int32_t rigid_compositor_render_async(
    const char* export_id,
    const char* config_json,
    RigidCompositorProgressCallback progress_callback,
    RigidCompositorCompletionCallback completion_callback
);

// Cancel an in-progress render
void rigid_compositor_cancel(void);

#endif // RIGID_CAPTURE_KIT_H
