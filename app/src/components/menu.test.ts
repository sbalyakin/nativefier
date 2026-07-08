import type {
  BrowserWindow,
  MenuItemConstructorOptions,
} from '../adapters/electronTypes';

jest.mock('../helpers/helpers');
import { isOSX } from '../helpers/helpers';
jest.mock('../helpers/windowHelpers', () => ({
  ...jest.requireActual('../helpers/windowHelpers'),
  promptAndNavigateToUrl: jest.fn(() => Promise.resolve()),
  getCurrentURL: jest.fn(() => 'https://example.com/'),
}));
import { promptAndNavigateToUrl } from '../helpers/windowHelpers';
import { generateMenu } from './menu';

function createMockBrowserWindow(): {
  window: BrowserWindow;
  mockIsFullScreen: jest.Mock;
  mockIsFullScreenable: jest.Mock;
  mockIsSimpleFullScreen: jest.Mock;
  mockSetFullScreen: jest.Mock;
  mockSetSimpleFullScreen: jest.Mock;
} {
  const mockIsFullScreen = jest.fn(() => false);
  const mockIsFullScreenable = jest.fn(() => true);
  const mockIsSimpleFullScreen = jest.fn(() => false);
  const mockSetFullScreen = jest.fn();
  const mockSetSimpleFullScreen = jest.fn();
  return {
    window: {
      isFullScreen: mockIsFullScreen,
      isFullScreenable: mockIsFullScreenable,
      isSimpleFullScreen: mockIsSimpleFullScreen,
      setFullScreen: mockSetFullScreen,
      setSimpleFullScreen: mockSetSimpleFullScreen,
      webContents: { toggleDevTools: jest.fn() },
    } as unknown as BrowserWindow,
    mockIsFullScreen,
    mockIsFullScreenable,
    mockIsSimpleFullScreen,
    mockSetFullScreen,
    mockSetSimpleFullScreen,
  };
}

describe('generateMenu', () => {
  let window: BrowserWindow;
  const mockIsOSX: jest.SpyInstance = isOSX as jest.Mock;
  let mockIsFullScreen: jest.Mock;
  let mockIsFullScreenable: jest.Mock;
  let mockIsSimpleFullScreen: jest.Mock;
  let mockSetFullScreen: jest.Mock;
  let mockSetSimpleFullScreen: jest.Mock;

  beforeEach(() => {
    const mocks = createMockBrowserWindow();
    window = mocks.window;
    mockIsFullScreen = mocks.mockIsFullScreen;
    mockIsFullScreenable = mocks.mockIsFullScreenable;
    mockIsSimpleFullScreen = mocks.mockIsSimpleFullScreen;
    mockSetFullScreen = mocks.mockSetFullScreen;
    mockSetSimpleFullScreen = mocks.mockSetSimpleFullScreen;
    mockIsOSX.mockReset();
    mockIsFullScreen.mockReturnValue(false);
    mockIsFullScreenable.mockReturnValue(true);
    mockIsSimpleFullScreen.mockReturnValue(false);
  });

  test('has Go to URL in the View menu', () => {
    const menu = generateMenu(
      {
        webholmVersion: '1.0.0',
        zoom: 1.0,
        disableDevTools: false,
      },
      window,
    );

    const viewMenu = menu.filter((item) => item.label === '&View');
    const goToUrl = (
      viewMenu[0].submenu as MenuItemConstructorOptions[]
    ).filter((item) => item.label === 'Go to URL...');

    expect(goToUrl).toHaveLength(1);
    expect(goToUrl[0].accelerator).toBe('CmdOrCtrl+L');

    // @ts-expect-error click is here TypeScript...
    goToUrl[0].click(null, window);

    expect(promptAndNavigateToUrl).toHaveBeenCalledTimes(1);
  });

  test('does not have fullscreen if not supported', () => {
    mockIsOSX.mockReturnValue(false);
    mockIsFullScreenable.mockReturnValue(false);

    const menu = generateMenu(
      {
        webholmVersion: '1.0.0',
        zoom: 1.0,
        disableDevTools: false,
      },
      window,
    );

    const editMenu = menu.filter((item) => item.label === '&View');

    const fullscreen = (
      editMenu[0].submenu as MenuItemConstructorOptions[]
    ).filter((item) => item.label === 'Toggle Full Screen');

    expect(fullscreen).toHaveLength(1);
    expect(fullscreen[0].enabled).toBe(false);
    expect(fullscreen[0].visible).toBe(false);

    expect(mockIsOSX).toHaveBeenCalled();
    expect(mockIsFullScreenable).toHaveBeenCalled();
  });

  test('has fullscreen no matter what on mac', () => {
    mockIsOSX.mockReturnValue(true);
    mockIsFullScreenable.mockReturnValue(false);

    const menu = generateMenu(
      {
        webholmVersion: '1.0.0',
        zoom: 1.0,
        disableDevTools: false,
      },
      window,
    );

    const editMenu = menu.filter((item) => item.label === '&View');

    const fullscreen = (
      editMenu[0].submenu as MenuItemConstructorOptions[]
    ).filter((item) => item.label === 'Toggle Full Screen');

    expect(fullscreen).toHaveLength(1);
    expect(fullscreen[0].enabled).toBe(true);
    expect(fullscreen[0].visible).toBe(true);

    expect(mockIsOSX).toHaveBeenCalled();
    expect(mockIsFullScreenable).toHaveBeenCalled();
  });

  test.each([true, false])(
    'has a fullscreen menu item that toggles fullscreen',
    (isFullScreen) => {
      mockIsOSX.mockReturnValue(false);
      mockIsFullScreenable.mockReturnValue(true);
      mockIsFullScreen.mockReturnValue(isFullScreen);

      const menu = generateMenu(
        {
          webholmVersion: '1.0.0',
          zoom: 1.0,
          disableDevTools: false,
        },
        window,
      );

      const editMenu = menu.filter((item) => item.label === '&View');

      const fullscreen = (
        editMenu[0].submenu as MenuItemConstructorOptions[]
      ).filter((item) => item.label === 'Toggle Full Screen');

      expect(fullscreen).toHaveLength(1);
      expect(fullscreen[0].enabled).toBe(true);
      expect(fullscreen[0].visible).toBe(true);

      expect(mockIsOSX).toHaveBeenCalled();
      expect(mockIsFullScreenable).toHaveBeenCalled();

      // @ts-expect-error click is here TypeScript...
      fullscreen[0].click(null, window);

      expect(mockSetFullScreen).toHaveBeenCalledWith(!isFullScreen);
      expect(mockSetSimpleFullScreen).not.toHaveBeenCalled();
    },
  );

  test.each([true, false])(
    'has a fullscreen menu item that toggles simplefullscreen as a fallback on mac',
    (isFullScreen) => {
      mockIsOSX.mockReturnValue(true);
      mockIsFullScreenable.mockReturnValue(false);
      mockIsSimpleFullScreen.mockReturnValue(isFullScreen);

      const menu = generateMenu(
        {
          webholmVersion: '1.0.0',
          zoom: 1.0,
          disableDevTools: false,
        },
        window,
      );

      const editMenu = menu.filter((item) => item.label === '&View');

      const fullscreen = (
        editMenu[0].submenu as MenuItemConstructorOptions[]
      ).filter((item) => item.label === 'Toggle Full Screen');

      expect(fullscreen).toHaveLength(1);
      expect(fullscreen[0].enabled).toBe(true);
      expect(fullscreen[0].visible).toBe(true);

      expect(mockIsOSX).toHaveBeenCalled();
      expect(mockIsFullScreenable).toHaveBeenCalled();

      // @ts-expect-error click is here TypeScript...
      fullscreen[0].click(null, window);

      expect(mockSetSimpleFullScreen).toHaveBeenCalledWith(!isFullScreen);
      expect(mockSetFullScreen).not.toHaveBeenCalled();
    },
  );
});
