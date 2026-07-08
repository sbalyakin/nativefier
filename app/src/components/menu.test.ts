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
jest.mock('../adapters/menuAdapter', () => ({
  buildApplicationMenu: jest.fn(),
  setApplicationMenu: jest.fn(),
  getApplicationMenu: jest.fn(),
  getMenuItemById: jest.fn(),
}));
import { getApplicationMenu, getMenuItemById } from '../adapters/menuAdapter';
import {
  generateMenu,
  PIN_ON_TOP_MENU_ITEM_ID,
  syncPinOnTopMenuItemChecked,
} from './menu';

function createMockBrowserWindow(): {
  window: BrowserWindow;
  mockIsFullScreen: jest.Mock;
  mockIsFullScreenable: jest.Mock;
  mockIsSimpleFullScreen: jest.Mock;
  mockSetFullScreen: jest.Mock;
  mockSetSimpleFullScreen: jest.Mock;
  mockIsAlwaysOnTop: jest.Mock;
  mockSetAlwaysOnTop: jest.Mock;
} {
  const mockIsFullScreen = jest.fn(() => false);
  const mockIsFullScreenable = jest.fn(() => true);
  const mockIsSimpleFullScreen = jest.fn(() => false);
  const mockSetFullScreen = jest.fn();
  const mockSetSimpleFullScreen = jest.fn();
  const mockIsAlwaysOnTop = jest.fn(() => false);
  const mockSetAlwaysOnTop = jest.fn();
  return {
    window: {
      isFullScreen: mockIsFullScreen,
      isFullScreenable: mockIsFullScreenable,
      isSimpleFullScreen: mockIsSimpleFullScreen,
      setFullScreen: mockSetFullScreen,
      setSimpleFullScreen: mockSetSimpleFullScreen,
      isAlwaysOnTop: mockIsAlwaysOnTop,
      setAlwaysOnTop: mockSetAlwaysOnTop,
      webContents: { toggleDevTools: jest.fn() },
    } as unknown as BrowserWindow,
    mockIsFullScreen,
    mockIsFullScreenable,
    mockIsSimpleFullScreen,
    mockSetFullScreen,
    mockSetSimpleFullScreen,
    mockIsAlwaysOnTop,
    mockSetAlwaysOnTop,
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
  let mockIsAlwaysOnTop: jest.Mock;
  let mockSetAlwaysOnTop: jest.Mock;

  beforeEach(() => {
    const mocks = createMockBrowserWindow();
    window = mocks.window;
    mockIsFullScreen = mocks.mockIsFullScreen;
    mockIsFullScreenable = mocks.mockIsFullScreenable;
    mockIsSimpleFullScreen = mocks.mockIsSimpleFullScreen;
    mockSetFullScreen = mocks.mockSetFullScreen;
    mockSetSimpleFullScreen = mocks.mockSetSimpleFullScreen;
    mockIsAlwaysOnTop = mocks.mockIsAlwaysOnTop;
    mockSetAlwaysOnTop = mocks.mockSetAlwaysOnTop;
    mockIsOSX.mockReset();
    mockIsFullScreen.mockReturnValue(false);
    mockIsFullScreenable.mockReturnValue(true);
    mockIsSimpleFullScreen.mockReturnValue(false);
    mockIsAlwaysOnTop.mockReturnValue(false);
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

  test.each([true, false])(
    'has a Pin on Top menu item reflecting and toggling alwaysOnTop, checked=%s',
    (isAlwaysOnTop) => {
      mockIsAlwaysOnTop.mockReturnValue(isAlwaysOnTop);
      const onPinOnTopChange = jest.fn();

      const menu = generateMenu(
        {
          webholmVersion: '1.0.0',
          zoom: 1.0,
          disableDevTools: false,
        },
        window,
        onPinOnTopChange,
      );

      const viewMenu = menu.filter((item) => item.label === '&View');
      const pinOnTop = (
        viewMenu[0].submenu as MenuItemConstructorOptions[]
      ).filter((item) => item.label === 'Pin on Top');

      expect(pinOnTop).toHaveLength(1);
      expect(pinOnTop[0].type).toBe('checkbox');
      expect(pinOnTop[0].checked).toBe(isAlwaysOnTop);

      const clickedItem = { checked: !isAlwaysOnTop };
      // @ts-expect-error click is here TypeScript...
      pinOnTop[0].click(clickedItem, window);

      expect(mockSetAlwaysOnTop).toHaveBeenCalledWith(!isAlwaysOnTop);
      expect(onPinOnTopChange).toHaveBeenCalledWith(!isAlwaysOnTop);
    },
  );
});

describe('syncPinOnTopMenuItemChecked', () => {
  const mockGetApplicationMenu = getApplicationMenu as jest.Mock;
  const mockGetMenuItemById = getMenuItemById as jest.Mock;

  beforeEach(() => {
    mockGetApplicationMenu.mockReset();
    mockGetMenuItemById.mockReset();
  });

  test.each([true, false])(
    'syncs the Pin on Top checkbox to the given window state, alwaysOnTop=%s',
    (windowAlwaysOnTop) => {
      const menu = {};
      const pinOnTopItem = { checked: !windowAlwaysOnTop };
      mockGetApplicationMenu.mockReturnValue(menu);
      mockGetMenuItemById.mockReturnValue(pinOnTopItem);

      const window = {
        isAlwaysOnTop: jest.fn(() => windowAlwaysOnTop),
      } as unknown as BrowserWindow;

      syncPinOnTopMenuItemChecked(window);

      expect(mockGetMenuItemById).toHaveBeenCalledWith(
        menu,
        PIN_ON_TOP_MENU_ITEM_ID,
      );
      expect(pinOnTopItem.checked).toBe(windowAlwaysOnTop);
    },
  );

  it('no-ops when there is no application menu', () => {
    mockGetApplicationMenu.mockReturnValue(null);
    const window = {
      isAlwaysOnTop: jest.fn(() => true),
    } as unknown as BrowserWindow;

    expect(() => syncPinOnTopMenuItemChecked(window)).not.toThrow();
    expect(mockGetMenuItemById).not.toHaveBeenCalled();
  });

  it('no-ops when the Pin on Top menu item is not found', () => {
    mockGetApplicationMenu.mockReturnValue({});
    mockGetMenuItemById.mockReturnValue(null);
    const window = {
      isAlwaysOnTop: jest.fn(() => true),
    } as unknown as BrowserWindow;

    expect(() => syncPinOnTopMenuItemChecked(window)).not.toThrow();
  });
});
