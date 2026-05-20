const mockPlatform = jest.fn<string, []>();

jest.mock('os', () => ({
  platform: (): string => mockPlatform(),
}));

import { isLinux, isWayland } from './platform';

const originalWaylandDisplay = process.env.WAYLAND_DISPLAY;
const originalSessionType = process.env.XDG_SESSION_TYPE;

beforeEach(() => {
  mockPlatform.mockReturnValue('darwin');
});

afterEach(() => {
  if (originalWaylandDisplay === undefined) {
    delete process.env.WAYLAND_DISPLAY;
  } else {
    process.env.WAYLAND_DISPLAY = originalWaylandDisplay;
  }
  if (originalSessionType === undefined) {
    delete process.env.XDG_SESSION_TYPE;
  } else {
    process.env.XDG_SESSION_TYPE = originalSessionType;
  }
});

test('isLinux reflects os.platform', () => {
  mockPlatform.mockReturnValue('linux');
  expect(isLinux()).toBe(true);
  mockPlatform.mockReturnValue('darwin');
  expect(isLinux()).toBe(false);
});

test('isWayland is false on non-linux platforms', () => {
  mockPlatform.mockReturnValue('darwin');
  process.env.WAYLAND_DISPLAY = 'wayland-0';
  expect(isWayland()).toBe(false);
});

test('isWayland is true on linux with WAYLAND_DISPLAY', () => {
  mockPlatform.mockReturnValue('linux');
  delete process.env.XDG_SESSION_TYPE;
  process.env.WAYLAND_DISPLAY = 'wayland-0';
  expect(isWayland()).toBe(true);
});

test('isWayland is true on linux with wayland session type', () => {
  mockPlatform.mockReturnValue('linux');
  delete process.env.WAYLAND_DISPLAY;
  process.env.XDG_SESSION_TYPE = 'wayland';
  expect(isWayland()).toBe(true);
});

test('isWayland is false on linux without wayland signals', () => {
  mockPlatform.mockReturnValue('linux');
  delete process.env.WAYLAND_DISPLAY;
  delete process.env.XDG_SESSION_TYPE;
  expect(isWayland()).toBe(false);
});
