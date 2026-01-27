#ifndef TAKA_CAPTURE_KIT_H
#define TAKA_CAPTURE_KIT_H

#include <stdint.h>
#include <stdbool.h>

// Error codes
typedef enum {
    TAKA_SUCCESS = 0,
    TAKA_ERROR_NOT_AUTHORIZED = 1,
    TAKA_ERROR_INVALID_CONFIG = 2,
    TAKA_ERROR_RECORDING_FAILED = 3,
    TAKA_ERROR_ENCODING_FAILED = 4,
    TAKA_ERROR_NO_RECORDING = 5,
    TAKA_ERROR_SCREENSHOT_FAILED = 6,
    TAKA_ERROR_WINDOW_NOT_FOUND = 7,
    TAKA_ERROR_DISPLAY_NOT_FOUND = 8,
} TakaErrorCode;

// Video codec options (passed as int32_t)
#define TAKA_CODEC_H264 0
#define TAKA_CODEC_HEVC 1
#define TAKA_CODEC_PRORES_422 2
#define TAKA_CODEC_PRORES_422_HQ 3

// Opaque handle to the capture engine
typedef void* TakaCaptureHandle;

// ============================================================================
// Lifecycle
// ============================================================================

// Create a new capture engine instance
TakaCaptureHandle taka_capture_create(void);

// Destroy a capture engine instance
void taka_capture_destroy(TakaCaptureHandle handle);

// ============================================================================
// Authorization
// ============================================================================

// Check if screen capture permission is granted
bool taka_capture_check_permission(void);

// Request screen capture permission (opens system dialog)
void taka_capture_request_permission(void);

// ============================================================================
// Window/Display enumeration (JSON-based for FFI simplicity)
// ============================================================================

// List all capturable windows as JSON array string
// Caller must free with taka_free_string
// JSON format: [{"window_id":123, "title":"...", "owner_name":"...",
//                "x":0, "y":0, "width":800, "height":600, "backing_scale_factor":2.0}, ...]
char* taka_capture_list_windows_json(void);

// List all displays as JSON array string
// Caller must free with taka_free_string
// JSON format: [{"display_id":1, "name":"...", "width":1920, "height":1080,
//                "backing_scale_factor":2.0, "is_main":true}, ...]
char* taka_capture_list_displays_json(void);

// Free a string allocated by the library
void taka_free_string(char* str);

// ============================================================================
// Recording - Window
// ============================================================================

// Start recording a specific window
// Parameters passed individually for FFI compatibility
int32_t taka_capture_start_window_recording(
    TakaCaptureHandle handle,
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
int32_t taka_capture_start_display_recording(
    TakaCaptureHandle handle,
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
int32_t taka_capture_start_region_recording(
    TakaCaptureHandle handle,
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
int32_t taka_capture_stop_recording(TakaCaptureHandle handle);

// Cancel the current recording and delete partial file
int32_t taka_capture_cancel_recording(TakaCaptureHandle handle);

// Check if currently recording
bool taka_capture_is_recording(TakaCaptureHandle handle);

// Get duration of current recording in milliseconds
int64_t taka_capture_get_recording_duration_ms(TakaCaptureHandle handle);

// ============================================================================
// Screenshot - Window
// ============================================================================

// Capture a screenshot of a specific window
int32_t taka_capture_screenshot_window(
    uint32_t window_id,
    const char* output_path,
    float scale_factor,
    bool capture_cursor
);

// ============================================================================
// Screenshot - Display
// ============================================================================

// Capture a screenshot of an entire display
int32_t taka_capture_screenshot_display(
    uint32_t display_id,
    const char* output_path,
    float scale_factor,
    bool capture_cursor
);

// ============================================================================
// Screenshot - Region
// ============================================================================

// Capture a screenshot of a region
int32_t taka_capture_screenshot_region(
    uint32_t display_id,
    int32_t x,
    int32_t y,
    int32_t width,
    int32_t height,
    const char* output_path,
    float scale_factor,
    bool capture_cursor
);

#endif // TAKA_CAPTURE_KIT_H
