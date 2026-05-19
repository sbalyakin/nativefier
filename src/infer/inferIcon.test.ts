import pageIcon from 'page-icon';

import { downloadFile, getTempDir } from '../helpers/helpers';
import { inferIcon } from './inferIcon';

jest.mock('gitcloud', () => jest.fn().mockResolvedValue([]));
jest.mock('page-icon');
jest.mock('fs', () => {
  const actualFs = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    writeFile: jest.fn(
      (
        _path: string,
        _data: Buffer,
        callback: (err: NodeJS.ErrnoException | null) => void,
      ) => callback(null),
    ),
  };
});
jest.mock('../helpers/helpers', () => ({
  ...jest.requireActual('../helpers/helpers'),
  downloadFile: jest.fn(),
  getTempDir: jest.fn(() => '/tmp/nativefier-iconinfer-test'),
}));

describe('inferIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses favicon service when page icon extraction fails', async () => {
    (pageIcon as jest.Mock).mockRejectedValueOnce(
      new Error('Request failed with status code 403'),
    );
    (downloadFile as jest.Mock).mockResolvedValueOnce({
      data: Buffer.from('fake-png'),
      ext: '',
    });

    const iconPath = await inferIcon('https://chatgpt.com/', 'darwin');

    expect(downloadFile).toHaveBeenCalledWith(
      'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128',
    );
    expect(iconPath).toBe('/tmp/nativefier-iconinfer-test/icon.png');
    expect(getTempDir).toHaveBeenCalledWith('iconinfer');
  });

  test('returns undefined when all icon sources fail', async () => {
    (pageIcon as jest.Mock).mockRejectedValueOnce(
      new Error('Request failed with status code 403'),
    );
    (downloadFile as jest.Mock).mockRejectedValueOnce(
      new Error('favicon service failed'),
    );

    const iconPath = await inferIcon('https://chatgpt.com/', 'darwin');

    expect(iconPath).toBeUndefined();
  });
});
