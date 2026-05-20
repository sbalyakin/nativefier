import type {
  BrowserWindow,
  MenuItemConstructorOptions,
} from '../adapters/electronTypes';

jest.mock('../helpers/helpers');
import { isOSX } from '../helpers/helpers';
import { generateMenu } from './menu';

function createMockBrowserWindow(): BrowserWindow {
  return {
    isFullScreen: jest.fn(() => false),
    isFullScreenable: jest.fn(() => true),
    isSimpleFullScreen: jest.fn(() => false),
    setFullScreen: jest.fn(),
    setSimpleFullScreen: jest.fn(),
    webContents: { toggleDevTools: jest.fn() },
  } as unknown as BrowserWindow;
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
    window = createMockBrowserWindow();
    mockIsFullScreen = window.isFullScreen as jest.Mock;
    mockIsFullScreenable = window.isFullScreenable as jest.Mock;
    mockIsSimpleFullScreen = window.isSimpleFullScreen as jest.Mock;
    mockSetFullScreen = window.setFullScreen as jest.Mock;
    mockSetSimpleFullScreen = window.setSimpleFullScreen as jest.Mock;
    mockIsOSX.mockReset();
    mockIsFullScreen.mockReturnValue(false);
    mockIsFullScreenable.mockReturnValue(true);
    mockIsSimpleFullScreen.mockReturnValue(false);
  });

  test('does not have fullscreen if not supported', () => {
    mockIsOSX.mockReturnValue(false);
    mockIsFullScreenable.mockReturnValue(false);

    const menu = generateMenu(
      {
        nativefierVersion: '1.0.0',
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
        nativefierVersion: '1.0.0',
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
          nativefierVersion: '1.0.0',
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
          nativefierVersion: '1.0.0',
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
