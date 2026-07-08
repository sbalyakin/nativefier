import { downloadFile, getTempDir } from '../helpers/helpers';
import { fetchPageIcon } from './fetchPageIcon';
import { inferIcon } from './inferIcon';

jest.mock('gitcloud', () => jest.fn().mockResolvedValue([]));
jest.mock('./fetchPageIcon');
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
    (fetchPageIcon as jest.Mock).mockResolvedValueOnce(undefined);
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

  test('uses favicon service when page icon extraction times out', async () => {
    (fetchPageIcon as jest.Mock).mockResolvedValueOnce(undefined);
    (downloadFile as jest.Mock).mockResolvedValueOnce({
      data: Buffer.from('fake-png'),
      ext: '',
    });

    const iconPath = await inferIcon('https://progressme.ru/', 'darwin');

    expect(fetchPageIcon).toHaveBeenCalledWith(
      'https://progressme.ru/',
      '.png',
      10_000,
    );
    expect(downloadFile).toHaveBeenCalledWith(
      'https://www.google.com/s2/favicons?domain=progressme.ru&sz=128',
    );
    expect(iconPath).toBe('/tmp/nativefier-iconinfer-test/icon.png');
  });

  test('returns undefined when all icon sources fail', async () => {
    (fetchPageIcon as jest.Mock).mockResolvedValueOnce(undefined);
    (downloadFile as jest.Mock).mockRejectedValueOnce(
      new Error('favicon service failed'),
    );

    const iconPath = await inferIcon('https://chatgpt.com/', 'darwin');

    expect(iconPath).toBeUndefined();
  });
});
