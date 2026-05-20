const mockWebContentsOn = jest.fn();
const mockWebContentsOnce = jest.fn();
const mockWebContentsSend = jest.fn();
const mockWebContentsGoBack = jest.fn();
const mockWebContentsInsertCSS = jest.fn(() => Promise.resolve('key'));
const mockWindowOn = jest.fn();
const mockWindowOnce = jest.fn();
const mockWindowShow = jest.fn();
const mockWindowEmit = jest.fn(() => true);
const mockIsFullScreen = jest.fn(() => false);
const mockSetFullScreen = jest.fn();
const mockMoveTabToNewWindow = jest.fn();
const mockLoadURL = jest.fn(() => Promise.resolve());

jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    on: mockWindowOn,
    once: mockWindowOnce,
    show: mockWindowShow,
    emit: mockWindowEmit,
    isFullScreen: mockIsFullScreen,
    setFullScreen: mockSetFullScreen,
    moveTabToNewWindow: mockMoveTabToNewWindow,
    loadURL: mockLoadURL,
    webContents: {
      zoomFactor: 1,
      on: mockWebContentsOn,
      once: mockWebContentsOnce,
      send: mockWebContentsSend,
      goBack: mockWebContentsGoBack,
      insertCSS: mockWebContentsInsertCSS,
    },
  })),
}));

import {
  adjustZoomFactor,
  createBrowserWindow,
  emitBrowserWindowEvent,
  goBack,
  insertCSS,
  loadUrl,
  onBrowserWindowEvent,
  onceBrowserWindowEvent,
  sendToWebContents,
  showBrowserWindow,
} from './windowAdapter';

describe('windowAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onBrowserWindowEvent and onceBrowserWindowEvent delegate to BrowserWindow', () => {
    const window = createBrowserWindow({});
    const listener = jest.fn();

    onBrowserWindowEvent(window, 'close', listener);
    onceBrowserWindowEvent(window, 'focus', listener);

    expect(mockWindowOn).toHaveBeenCalledWith('close', listener);
    expect(mockWindowOnce).toHaveBeenCalledWith('focus', listener);
  });

  it('showBrowserWindow and emitBrowserWindowEvent delegate to BrowserWindow', () => {
    const window = createBrowserWindow({});

    showBrowserWindow(window);
    expect(mockWindowShow).toHaveBeenCalled();

    const payload = { url: 'https://example.com' };
    emitBrowserWindowEvent(window, 'new-window-for-tab', payload);
    expect(mockWindowEmit).toHaveBeenCalledWith(
      'new-window-for-tab',
      payload,
    );
  });

  it('loadUrl, sendToWebContents, goBack, and insertCSS delegate to window/webContents', async () => {
    const window = createBrowserWindow({});

    await loadUrl(window, 'https://example.com');
    expect(mockLoadURL).toHaveBeenCalledWith('https://example.com');

    sendToWebContents(window, 'open-url', 'https://example.com');
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      'open-url',
      'https://example.com',
    );

    goBack(window);
    expect(mockWebContentsGoBack).toHaveBeenCalled();

    await insertCSS(window, '.x { color: red; }');
    expect(mockWebContentsInsertCSS).toHaveBeenCalledWith('.x { color: red; }');
  });

  it('adjustZoomFactor changes webContents.zoomFactor', () => {
    const window = createBrowserWindow({});
    window.webContents.zoomFactor = 1.5;

    adjustZoomFactor(window, 0.1);
    expect(window.webContents.zoomFactor).toBeCloseTo(1.6);
  });
});
