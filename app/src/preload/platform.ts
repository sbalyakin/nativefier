import * as os from 'os';

// Canonical platform detection for preload and app/src/helpers/helpers.ts re-exports.
export function isLinux(): boolean {
  return os.platform() === 'linux';
}

export function isWayland(): boolean {
  return (
    isLinux() &&
    (Boolean(process.env.WAYLAND_DISPLAY) ||
      process.env.XDG_SESSION_TYPE === 'wayland')
  );
}
