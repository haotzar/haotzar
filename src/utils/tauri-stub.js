// Stub for Tauri API when running in Electron
// This prevents errors when static imports try to load @tauri-apps/api
// Note: For dynamic imports, use try-catch to detect the actual runtime

export const invoke = async () => {
  console.warn('⚠️ Tauri API called but not available (running in Electron)');
  throw new Error('Tauri API not available - running in Electron mode');
};

export const open = async () => {
  console.warn('⚠️ Tauri API called but not available (running in Electron)');
  throw new Error('Tauri API not available - running in Electron mode');
};

export const readBinaryFile = async () => {
  console.warn('⚠️ Tauri API called but not available (running in Electron)');
  throw new Error('Tauri API not available - running in Electron mode');
};

export const convertFileSrc = (filePath) => {
  console.warn('⚠️ Tauri API called but not available (running in Electron)');
  throw new Error('Tauri API not available - running in Electron mode');
};

export default {
  invoke,
  open,
  readBinaryFile,
  convertFileSrc
};
