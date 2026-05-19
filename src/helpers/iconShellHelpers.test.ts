import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import axios from 'axios';

import { convertToIcns } from './iconShellHelpers';
import { isOSX } from './helpers';

const describeOnMac = isOSX() ? describe : describe.skip;

const DEFAULT_ELECTRON_ICNS_MD5 = '4a13255b576bab11acc21f55daab9cb4';

describeOnMac('convertToIcns', () => {
  test('builds a non-default .icns from Google favicon PNGs', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nativefier-icon-'));
    const pngPath = path.join(tmpDir, 'favicon.png');

    const { data } = await axios.get<Buffer>(
      'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128',
      { responseType: 'arraybuffer' },
    );
    fs.writeFileSync(pngPath, Buffer.from(data));

    const icnsPath = convertToIcns(pngPath);
    const md5 = crypto
      .createHash('md5')
      .update(fs.readFileSync(icnsPath))
      .digest('hex');

    expect(md5).not.toBe(DEFAULT_ELECTRON_ICNS_MD5);
  });
});
