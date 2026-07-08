import { execFile } from 'child_process';
import * as fs from 'fs-extra';

import {
  formatDarwinSetFileDate,
  touchPackagedAppCreationDate,
} from './touchPackagedAppCreationDate';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  utimes: jest.fn(),
}));

const execFileMock = execFile as unknown as jest.Mock;
const pathExistsMock = fs.pathExists as unknown as jest.Mock;
const utimesMock = fs.utimes as unknown as jest.Mock;

describe('formatDarwinSetFileDate', () => {
  test('formats date for SetFile', () => {
    const formatted = formatDarwinSetFileDate(
      new Date('2026-07-08T15:04:05'),
    );
    expect(formatted).toMatch(/^07\/08\/2026 \d{2}:04:05 (AM|PM)$/);
  });
});

describe('touchPackagedAppCreationDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pathExistsMock.mockResolvedValue(true);
    utimesMock.mockResolvedValue(undefined);
    execFileMock.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null) => void,
      ) => {
        cb(null);
      },
    );
  });

  test('updates macOS creation date and access/modify times for darwin apps', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    await touchPackagedAppCreationDate('/tmp/out', {
      platform: 'darwin',
      name: 'MyApp',
    });

    expect(execFileMock).toHaveBeenCalledWith(
      'SetFile',
      expect.arrayContaining(['-d', expect.any(String), '/tmp/out/MyApp.app']),
      expect.any(Function),
    );
    expect(utimesMock).toHaveBeenCalledWith(
      '/tmp/out/MyApp.app',
      expect.any(Date),
      expect.any(Date),
    );

    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  test('skips SetFile on non-darwin platforms', async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });

    await touchPackagedAppCreationDate('/tmp/out', {
      platform: 'linux',
      name: 'MyApp',
    });

    expect(execFileMock).not.toHaveBeenCalled();
    expect(utimesMock).toHaveBeenCalledWith(
      '/tmp/out/MyApp',
      expect.any(Date),
      expect.any(Date),
    );

    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  test('ignores missing runnable path', async () => {
    pathExistsMock.mockResolvedValue(false);

    await touchPackagedAppCreationDate('/tmp/out', {
      platform: 'darwin',
      name: 'MyApp',
    });

    expect(execFileMock).not.toHaveBeenCalled();
    expect(utimesMock).not.toHaveBeenCalled();
  });
});
