const mockContextMenu = jest.fn(() => jest.fn());

jest.mock('electron-context-menu', () => ({
  __esModule: true,
  default: mockContextMenu,
}));

import { initElectronContextMenu } from './contextMenuAdapter';

describe('contextMenuAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initElectronContextMenu delegates to electron-context-menu', () => {
    const prepend = jest.fn(() => []);
    const dispose = initElectronContextMenu({
      showCopyImage: true,
      prepend,
    });

    expect(mockContextMenu).toHaveBeenCalledWith({
      showCopyImage: true,
      prepend,
    });
    expect(typeof dispose).toBe('function');
  });
});
