import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import axios from 'axios';

import { convertToIcns, getMacOsIconCanvasSize } from './iconShellHelpers';
import { isOSX } from './helpers';

const describeOnMac = isOSX() ? describe : describe.skip;

const DEFAULT_ELECTRON_ICNS_MD5 = '4a13255b576bab11acc21f55daab9cb4';

describe('getMacOsIconCanvasSize', () => {
  test('keeps square artwork at 80 percent of the canvas', () => {
    expect(getMacOsIconCanvasSize(256, 256)).toBe(320);
  });

  test('centers rectangular artwork in a square safe area', () => {
    expect(getMacOsIconCanvasSize(256, 128)).toBe(320);
  });
});

describeOnMac('convertToIcns', () => {
  test('builds a non-default .icns from Google favicon PNGs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nativefier-icon-'));
    const pngPath = path.join(tmpDir, 'favicon.png');

    const { data } = await axios.get<Buffer>(
      'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128',
      { responseType: 'arraybuffer' },
    );
    const originalPng = Buffer.from(data);
    fs.writeFileSync(pngPath, originalPng);

    const icnsPath = convertToIcns(pngPath);
    const md5 = crypto
      .createHash('md5')
      .update(fs.readFileSync(icnsPath))
      .digest('hex');

    expect(md5).not.toBe(DEFAULT_ELECTRON_ICNS_MD5);
    expect(fs.readFileSync(pngPath)).toEqual(originalPng);
  });
});
