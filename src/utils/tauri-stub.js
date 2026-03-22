// Stub for Tauri API when running in Electron
// This prevents errors when dynamic imports try to load @tauri-apps/api

export const invoke = async () => {
  throw new Error('Tauri API not available in Electron');
};

export const open = async () => {
  throw new Error('Tauri API not available in Electron');
};

export const readBinaryFile = async () => {
  throw new Error('Tauri API not available in Electron');
};

export default {
  invoke,
  open,
  readBinaryFile
};
