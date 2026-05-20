const mockSetImage = jest.fn();
const mockGetBounds = jest.fn(() => ({ height: 22 }));
const mockSetToolTip = jest.fn();
const mockSetContextMenu = jest.fn();
const mockOn = jest.fn();
const mockResize = jest.fn((opts: { height: number }) => ({
  height: opts.height,
}));
const mockCreateFromPath = jest.fn(() => ({ resize: mockResize }));
const mockCreateEmpty = jest.fn(() => 'empty-image');
const mockTray = jest.fn().mockImplementation(() => ({
  setImage: mockSetImage,
  getBounds: mockGetBounds,
  setToolTip: mockSetToolTip,
  setContextMenu: mockSetContextMenu,
  on: mockOn,
}));
const mockBuildFromTemplate = jest.fn(() => 'tray-menu');

jest.mock('electron', () => ({
  Tray: mockTray,
  Menu: { buildFromTemplate: mockBuildFromTemplate },
  nativeImage: {
    createEmpty: mockCreateEmpty,
    createFromPath: mockCreateFromPath,
  },
}));

import {
  createEmptyTray,
  getTrayBounds,
  loadNativeImageFromPath,
  onTrayEvent,
  resizeNativeImage,
  setTrayContextMenu,
  setTrayImage,
  setTrayToolTip,
} from './trayAdapter';

describe('trayAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createEmptyTray and loadNativeImageFromPath delegate to electron', () => {
    createEmptyTray();
    expect(mockTray).toHaveBeenCalledWith('empty-image');

    const image = loadNativeImageFromPath('/icon.png');
    expect(mockCreateFromPath).toHaveBeenCalledWith('/icon.png');
    expect(image).toEqual({ resize: mockResize });
  });

  it('setTrayImage, getTrayBounds, setTrayToolTip, setTrayContextMenu, onTrayEvent delegate to Tray', () => {
    const tray = createEmptyTray();
    const image = loadNativeImageFromPath('/icon.png');

    setTrayImage(tray, image);
    expect(mockSetImage).toHaveBeenCalledWith(image);

    expect(getTrayBounds(tray)).toEqual({ height: 22 });

    setTrayToolTip(tray, 'tip');
    expect(mockSetToolTip).toHaveBeenCalledWith('tip');

    const menu = { id: 'menu' } as never;
    setTrayContextMenu(tray, menu);
    expect(mockSetContextMenu).toHaveBeenCalledWith(menu);

    const listener = jest.fn();
    onTrayEvent(tray, 'click', listener);
    expect(mockOn).toHaveBeenCalledWith('click', listener);
  });

  it('resizeNativeImage delegates to NativeImage.resize', () => {
    const image = loadNativeImageFromPath('/icon.png');
    resizeNativeImage(image, { height: 20 });
    expect(mockResize).toHaveBeenCalledWith({ height: 20 });
  });
});
