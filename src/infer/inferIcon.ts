import * as path from 'path';
import { writeFile } from 'fs';
import { promisify } from 'util';

import gitCloud = require('gitcloud');

import { logBuildStep } from '../build/buildProgress';
import { fetchPageIcon } from './fetchPageIcon';
import {
  downloadFile,
  DownloadResult,
  getAllowedIconFormats,
  getTempDir,
} from '../helpers/helpers';
import { getHostnameFromUrl } from '../helpers/urlHelpers';
import { withTimeout } from '../utils/withTimeout';
import * as log from 'loglevel';

const writeFileAsync = promisify(writeFile);

const PAGE_ICON_TIMEOUT_MS = 10_000;
const GITCLOUD_TIMEOUT_MS = 15_000;

const GITCLOUD_SPACE_DELIMITER = '-';
const GITCLOUD_URL = 'https://nativefier.github.io/nativefier-icons/';

type GitCloudIcon = {
  ext?: string;
  name?: string;
  score?: number;
  url?: string;
};

function getMaxMatchScore(iconWithScores: GitCloudIcon[]): number {
  const score = iconWithScores.reduce((maxScore, currentIcon) => {
    const currentScore = currentIcon.score;
    if (currentScore && currentScore > maxScore) {
      return currentScore;
    }
    return maxScore;
  }, 0);
  log.debug('Max icon match score:', score);
  return score;
}

function getMatchingIcons(
  iconsWithScores: GitCloudIcon[],
  maxScore: number,
): GitCloudIcon[] {
  return iconsWithScores.filter((item) => item.score === maxScore);
}

function mapIconWithMatchScore(
  cloudIcons: { name: string; url: string }[],
  targetUrl: string,
): GitCloudIcon[] {
  const normalisedTargetUrl = targetUrl.toLowerCase();
  return cloudIcons.map((item) => {
    const itemWords = item.name.split(GITCLOUD_SPACE_DELIMITER);
    const score: number = itemWords.reduce(
      (currentScore: number, word: string) => {
        if (normalisedTargetUrl.includes(word)) {
          return currentScore + 1;
        }
        return currentScore;
      },
      0,
    );

    return { ...item, ext: path.extname(item.url), score };
  });
}

async function inferIconFromStore(
  targetUrl: string,
  platform: string,
): Promise<DownloadResult | undefined> {
  log.debug(`Inferring icon from store for ${targetUrl} on ${platform}`);
  const allowedFormats = new Set<string | undefined>(
    getAllowedIconFormats(platform),
  );

  const cloudIcons = await withTimeout(
    gitCloud(GITCLOUD_URL),
    GITCLOUD_TIMEOUT_MS,
    `Icon library request timed out after ${GITCLOUD_TIMEOUT_MS}ms`,
  );
  log.debug(`Got ${cloudIcons.length} icons from gitcloud`);
  const iconWithScores = mapIconWithMatchScore(cloudIcons, targetUrl);
  const maxScore = getMaxMatchScore(iconWithScores);

  if (maxScore === 0) {
    log.debug('No relevant icon in store.');
    return undefined;
  }

  const iconsMatchingScore = getMatchingIcons(iconWithScores, maxScore);
  const iconsMatchingExt = iconsMatchingScore.filter((icon) =>
    allowedFormats.has(icon.ext ?? path.extname(icon.url as string)),
  );
  const matchingIcon = iconsMatchingExt[0];
  const iconUrl = matchingIcon && matchingIcon.url;

  if (!iconUrl) {
    log.debug('Could not infer icon from store');
    return undefined;
  }
  return downloadFile(iconUrl);
}

async function inferIconFromFaviconService(
  targetUrl: string,
): Promise<DownloadResult | undefined> {
  const hostname = getHostnameFromUrl(targetUrl);
  if (!hostname) {
    log.debug('Invalid URL for favicon service:', targetUrl);
    return undefined;
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
  log.debug(`Trying favicon service for ${hostname}`);
  try {
    const result = await downloadFile(faviconUrl);
    if (!result?.data?.length) {
      return undefined;
    }
    return {
      data: result.data,
      ext: '.png',
    };
  } catch (err: unknown) {
    log.debug('Favicon service failed:', err);
    logBuildStep(targetUrl, 'Google favicon failed, continuing without icon.');
    return undefined;
  }
}

export async function inferIcon(
  targetUrl: string,
  platform: string,
): Promise<string | undefined> {
  log.debug(`Inferring icon for ${targetUrl} on ${platform}`);
  const tmpDirPath = getTempDir('iconinfer');

  logBuildStep(targetUrl, 'Checking built-in icon library...');
  let icon: { ext: string; data: Buffer } | undefined;
  try {
    icon = await inferIconFromStore(targetUrl, platform);
  } catch (err: unknown) {
    log.debug('Icon library lookup failed:', err);
    logBuildStep(targetUrl, 'Icon library unavailable, skipping.');
  }

  if (!icon) {
    const ext = platform === 'win32' ? '.ico' : '.png';
    logBuildStep(
      targetUrl,
      `No library match, trying page favicon (${PAGE_ICON_TIMEOUT_MS / 1000}s limit)...`,
    );
    icon = await fetchPageIcon(targetUrl, ext, PAGE_ICON_TIMEOUT_MS);
    if (!icon) {
      logBuildStep(targetUrl, 'Page did not respond, trying Google favicon...');
      icon = await inferIconFromFaviconService(targetUrl);
    }
  } else {
    logBuildStep(targetUrl, 'Found icon in built-in library.');
  }

  if (!icon) {
    logBuildStep(targetUrl, 'No icon found, app will use the default.');
    return undefined;
  }
  log.debug(`Got an icon from the page.`);

  const iconPath = path.join(tmpDirPath, `icon${icon.ext}`);
  log.debug(
    `Writing ${(icon.data.length / 1024).toFixed(1)} kb icon to ${iconPath}`,
  );
  await writeFileAsync(iconPath, icon.data);
  logBuildStep(
    targetUrl,
    `Icon ready (${(icon.data.length / 1024).toFixed(1)} KB).`,
  );
  return iconPath;
}
