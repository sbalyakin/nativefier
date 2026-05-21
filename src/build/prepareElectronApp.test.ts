import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import type { AppOptions } from '../buildTimeContract';
import {
  appendDarwinAdhocCodesignHook,
  applyDarwinPackagerDefaults,
  normalizeAppName,
  resolveDarwinAppBundlePath,
} from './prepareElectronApp';

function makeDarwinOptions(overrides?: Partial<AppOptions['packager']>): AppOptions {
  return {
    packager: {
      platform: 'darwin',
      name: 'GmailSEB',
      dir: '/tmp/template',
      ...overrides,
    },
    nativefier: {},
  } as AppOptions;
}

describe('applyDarwinPackagerDefaults', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nativefier-darwin-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('sets extendInfo, copies entitlements, and adhoc sign hook on darwin', async () => {
    const src = path.join(tmpDir, 'src');
    const dest = path.join(tmpDir, 'dest');
    await fs.mkdir(src);
    await fs.mkdir(dest);
    await fs.writeFile(
      path.join(src, 'entitlements.mac.plist'),
      '<plist version="1.0"><dict/></plist>',
    );

    const options = makeDarwinOptions({
      appBundleId: 'com.electron.nativefier.gmailseb-nativefier-804458',
    });
    applyDarwinPackagerDefaults(src, dest, options);

    expect(options.packager.extendInfo).toMatchObject({
      NSUserNotificationUsageDescription:
        'Allow GmailSEB to show desktop notifications.',
    });
    expect(options.packager.osxSign).toBeUndefined();
    expect(Array.isArray(options.packager.afterComplete)).toBe(true);
    expect(options.packager.afterComplete).toHaveLength(1);
    expect(fs.existsSync(path.join(dest, 'entitlements.mac.plist'))).toBe(true);
  });

  test('does not add adhoc hook when user provides osxSign', async () => {
    const options = makeDarwinOptions({
      osxSign: { identity: 'Developer ID Application: Example' },
    });
    applyDarwinPackagerDefaults(tmpDir, tmpDir, options);
    expect(options.packager.osxSign).toEqual({
      identity: 'Developer ID Application: Example',
    });
    expect(options.packager.afterComplete).toBeUndefined();
  });

  test('appendDarwinAdhocCodesignHook is a no-op without appBundleId', () => {
    const options = makeDarwinOptions();
    appendDarwinAdhocCodesignHook(options);
    expect(options.packager.afterComplete).toBeUndefined();
  });

  test('no-op on linux', () => {
    const options = {
      packager: { platform: 'linux', dir: '/tmp' },
      nativefier: {},
    } as AppOptions;
    applyDarwinPackagerDefaults(tmpDir, tmpDir, options);
    expect(options.packager.osxSign).toBeUndefined();
    expect(options.packager.extendInfo).toBeUndefined();
  });
});

describe('resolveDarwinAppBundlePath', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nativefier-app-path-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('returns buildPath when it already ends with .app', () => {
    const appPath = path.join(tmpDir, 'GmailSEB.app');
    expect(resolveDarwinAppBundlePath(appPath, 'GmailSEB')).toBe(appPath);
  });

  test('finds app inside packager output folder when tmpdir is false', async () => {
    const outDir = path.join(tmpDir, 'GmailSEB-darwin-arm64');
    const appPath = path.join(outDir, 'GmailSEB.app');
    await fs.mkdirp(appPath);
    expect(resolveDarwinAppBundlePath(outDir, 'GmailSEB')).toBe(appPath);
  });
});

describe('normalizeAppName', () => {
  test('it is stable', () => {
    // Non-determinism / unstability would cause using a different appName
    // at each app regen, thus a different appData folder, which would cause
    // losing user state, including login state through cookies.
    const normalizedTrello = normalizeAppName('Trello', 'https://trello.com');
    expect(normalizedTrello).toBe('trello-nativefier-679e8e');
  });
});
