import "@testing-library/dom";

// Mock Tauri APIs for testing
const mockInvoke = async (_cmd: string, _args?: unknown) => {
  return Promise.resolve(null);
};

const mockListen = async (_event: string, _callback: (event: unknown) => void) => {
  return () => {};
};

// @ts-expect-error - Mocking Tauri globals for testing
globalThis.__TAURI_INTERNALS__ = {
  invoke: mockInvoke,
};

// @ts-expect-error - Mocking Tauri event API
globalThis.__TAURI_IPC__ = {
  listen: mockListen,
};
