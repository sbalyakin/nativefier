import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { isWindows, isOSX, getTempDir } from './helpers';
import * as log from 'loglevel';

const MACOS_ICON_CONTENT_SCALE = 0.8;

function runSips(args: string[]): string {
  const { status, stdout, stderr } = spawnSync('sips', args, {
    encoding: 'utf8',
  });
  if (status) {
    throw new Error(
      `sips ${args.join(' ')} failed with status ${status}: ${stderr}`,
    );
  }
  return stdout;
}

function getImageDimensions(imagePath: string): {
  width: number;
  height: number;
} {
  const output = runSips(['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath]);
  const width = /pixelWidth:\s*(\d+)/.exec(output)?.[1];
  const height = /pixelHeight:\s*(\d+)/.exec(output)?.[1];
  if (!width || !height) {
    throw new Error(`Could not determine image dimensions for ${imagePath}`);
  }
  return { width: Number(width), height: Number(height) };
}

export function getMacOsIconCanvasSize(width: number, height: number): number {
  return Math.ceil(Math.max(width, height) / MACOS_ICON_CONTENT_SCALE);
}

/**
 * Keep favicon artwork inside the macOS icon safe area, then re-encode indexed
 * PNGs as RGB because they break iconutil on recent macOS versions.
 */
export function normalizePngForIcns(pngPath: string): string {
  if (!isOSX() || path.extname(pngPath).toLowerCase() !== '.png') {
    return pngPath;
  }

  const { width, height } = getImageDimensions(pngPath);
  const canvasSize = getMacOsIconCanvasSize(width, height);
  const preparedPngPath = path.join(getTempDir('iconprep'), 'icon.png');
  const jpgPath = `${preparedPngPath}.nativefier-rgb.jpg`;
  log.debug('Padding and normalizing PNG for .icns conversion:', pngPath);
  try {
    runSips([
      '--padToHeightWidth',
      `${canvasSize}`,
      `${canvasSize}`,
      '--padColor',
      'FFFFFF',
      pngPath,
      '--out',
      preparedPngPath,
    ]);
    runSips(['-s', 'format', 'jpeg', preparedPngPath, '--out', jpgPath]);
    runSips(['-s', 'format', 'png', jpgPath, '--out', preparedPngPath]);
  } finally {
    try {
      fs.unlinkSync(jpgPath);
    } catch {
      // ignore missing temp file
    }
  }
  return preparedPngPath;
}

const SCRIPT_PATHS = {
  singleIco: path.join(__dirname, '../..', 'icon-scripts/singleIco'),
  convertToPng: path.join(__dirname, '../..', 'icon-scripts/convertToPng'),
  convertToIco: path.join(__dirname, '../..', 'icon-scripts/convertToIco'),
  convertToIcns: path.join(__dirname, '../..', 'icon-scripts/convertToIcns'),
  convertToTrayIcon: path.join(
    __dirname,
    '../..',
    'icon-scripts/convertToTrayIcon',
  ),
};

/**
 * Executes a shell script with the form "./pathToScript param1 param2"
 */
function iconShellHelper(
  shellScriptPath: string,
  icoSource: string,
  icoDestination: string,
): string {
  if (isWindows()) {
    throw new Error(
      'Icon conversion only supported on macOS or Linux. ' +
        'If building for Windows, download/create a .ico and pass it with --icon favicon.ico . ' +
        'If building for macOS/Linux, do it from macOS/Linux',
    );
  }

  const shellCommand = `"${shellScriptPath}" "${icoSource}" "${icoDestination}"`;
  log.debug(
    `Converting icon ${icoSource} to ${icoDestination}.`,
    `Calling shell command: ${shellCommand}`,
  );
  const { stdout, stderr, status } = spawnSync(
    shellScriptPath,
    [icoSource, icoDestination],
    { timeout: 10000 },
  );
  if (status) {
    throw new Error(
      `Icon conversion failed with status code ${status}.\nstdout: ${stdout.toString()}\nstderr: ${stderr.toString()}`,
    );
  }
  log.debug(`Conversion succeeded and produced icon at ${icoDestination}`);
  return icoDestination;
}

export function singleIco(icoSrc: string): string {
  return iconShellHelper(
    SCRIPT_PATHS.singleIco,
    icoSrc,
    `${getTempDir('iconconv')}/icon.ico`,
  );
}

export function convertToPng(icoSrc: string): string {
  return iconShellHelper(
    SCRIPT_PATHS.convertToPng,
    icoSrc,
    `${getTempDir('iconconv')}/icon.png`,
  );
}

export function convertToIco(icoSrc: string): string {
  return iconShellHelper(
    SCRIPT_PATHS.convertToIco,
    icoSrc,
    `${getTempDir('iconconv')}/icon.ico`,
  );
}

export function convertToIcns(icoSrc: string): string {
  if (!isOSX()) {
    throw new Error('macOS is required to convert to a .icns icon');
  }

  const preparedIconPath = normalizePngForIcns(icoSrc);

  return iconShellHelper(
    SCRIPT_PATHS.convertToIcns,
    preparedIconPath,
    `${getTempDir('iconconv')}/icon.icns`,
  );
}

export function convertToTrayIcon(icoSrc: string): string {
  if (!isOSX()) {
    throw new Error('macOS is required to convert from a .icns icon');
  }

  return iconShellHelper(
    SCRIPT_PATHS.convertToTrayIcon,
    icoSrc,
    `${path.dirname(icoSrc)}/tray-icon.png`,
  );
}
