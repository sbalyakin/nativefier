import * as fs from 'fs-extra';

import type { AppOptions, RawOptions } from '../../buildTimeContract';
import { copyIconsIfNecessary, prepareAssets } from './prepareAssets';

jest.mock('fs-extra', () => ({
  copy: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../buildIcon', () => ({
  convertIconIfNecessary: jest.fn(),
}));

import { convertIconIfNecessary } from '../buildIcon';

const convertIconIfNecessaryMock =
  convertIconIfNecessary as jest.MockedFunction<typeof convertIconIfNecessary>;

describe('copyIconsIfNecessary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('skips when no icon is configured', async () => {
    const options = {
      packager: { platform: 'linux' },
    } as AppOptions;
    await copyIconsIfNecessary(options, '/tmp/app');
    expect(fs.copy).not.toHaveBeenCalled();
  });

  test('copies icon into app folder on linux', async () => {
    const options = {
      packager: { platform: 'linux', icon: '/tmp/icons/app.png' },
    } as AppOptions;
    await copyIconsIfNecessary(options, '/tmp/app');
    expect(fs.copy).toHaveBeenCalledWith(
      '/tmp/icons/app.png',
      '/tmp/app/icon.png',
    );
  });

  test('copies tray icon on darwin when tray is enabled', async () => {
    const options = {
      packager: { platform: 'darwin', icon: '/tmp/icons/app.icns' },
      nativefier: { tray: 'true' },
    } as AppOptions;
    await copyIconsIfNecessary(options, '/tmp/app');
    expect(fs.copy).toHaveBeenCalledWith(
      '/tmp/icons/tray-icon.png',
      '/tmp/app/icon.png',
    );
  });
});

describe('prepareAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls convertIconIfNecessary before copying icons', async () => {
    const options = {
      packager: { platform: 'linux' },
    } as AppOptions;
    await prepareAssets(options, '/tmp/template', {} as RawOptions);
    expect(convertIconIfNecessaryMock).toHaveBeenCalledWith(options);
  });

  test('sets packager.quiet true when verbose is not set', async () => {
    const options = {
      packager: { platform: 'linux', quiet: false },
    } as AppOptions;
    await prepareAssets(options, '/tmp/template', {} as RawOptions);
    expect(options.packager.quiet).toBe(true);
  });

  test('sets packager.quiet false when verbose is true', async () => {
    const options = {
      packager: { platform: 'linux', quiet: true },
    } as AppOptions;
    await prepareAssets(options, '/tmp/template', {
      verbose: true,
    } as RawOptions);
    expect(options.packager.quiet).toBe(false);
  });
});
