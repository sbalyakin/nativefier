import axios from 'axios';
import {
  castlabsReleaseTagExists,
  compareElectronBaseVersions,
  resolveWidevineElectronVersion,
} from './widevineElectronVersion';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
});

test('compareElectronBaseVersions orders semver cores', () => {
  expect(compareElectronBaseVersions('42.1.0', '42.0.0')).toBeGreaterThan(0);
  expect(compareElectronBaseVersions('42.0.0', '42.1.0')).toBeLessThan(0);
  expect(compareElectronBaseVersions('42.0.0', '42.0.0')).toBe(0);
});

test('castlabsReleaseTagExists returns true only for HTTP 200', async () => {
  mockedAxios.get.mockResolvedValueOnce({ status: 200 });
  await expect(castlabsReleaseTagExists('42.0.0+wvcus')).resolves.toBe(true);

  mockedAxios.get.mockRejectedValueOnce(new Error('404'));
  await expect(castlabsReleaseTagExists('42.1.0+wvcus')).resolves.toBe(false);
});

test('resolveWidevineElectronVersion uses exact tag when published', async () => {
  mockedAxios.get.mockImplementation(async (url: string) => {
    if (url.includes('/releases/tag/v42.1.0+wvcus')) {
      return { status: 200 };
    }
    throw new Error('not found');
  });

  await expect(
    resolveWidevineElectronVersion('42.1.0', '+wvcus'),
  ).resolves.toBe('42.1.0+wvcus');
});

test('resolveWidevineElectronVersion falls back to newest stable same major', async () => {
  mockedAxios.get.mockImplementation(async (url: string, config?: object) => {
    if (url.includes('/releases/tag/v42.1.0+wvcus')) {
      throw new Error('404');
    }
    if (url.includes('/releases/tag/v42.0.0+wvcus')) {
      return { status: 200 };
    }
    if (url === 'https://api.github.com/repos/castlabs/electron-releases/releases') {
      return {
        data: [
          { tag_name: 'v42.0.0+wvcus' },
          { tag_name: 'v42.0.0-alpha.6+wvcus' },
          { tag_name: 'v41.5.0+wvcus' },
        ],
      };
    }
    return mockedAxios.get(url, config);
  });

  await expect(
    resolveWidevineElectronVersion('42.1.0', '+wvcus'),
  ).resolves.toBe('42.0.0+wvcus');
});

test('resolveWidevineElectronVersion throws when no same-major release exists', async () => {
  mockedAxios.get.mockImplementation(async (url: string) => {
    if (url.includes('/releases/tag/')) {
      throw new Error('404');
    }
    return {
      data: [{ tag_name: 'v41.5.0+wvcus' }],
    };
  });

  await expect(
    resolveWidevineElectronVersion('99.0.0', '+wvcus'),
  ).rejects.toThrow(/No castLabs Electron release found for major 99/);
});
