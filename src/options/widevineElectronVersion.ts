import axios from 'axios';
import * as log from 'loglevel';

const CASTLABS_RELEASES_API =
  'https://api.github.com/repos/castlabs/electron-releases/releases';
const CASTLABS_RELEASE_TAG_BASE =
  'https://github.com/castlabs/electron-releases/releases/tag/v';

function parseVersionParts(version: string): number[] {
  const core = version.split('+')[0]?.split('-')[0] ?? version;
  return core.split('.').map((part) => parseInt(part, 10) || 0);
}

function compareVersionParts(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export function compareElectronBaseVersions(a: string, b: string): number {
  return compareVersionParts(parseVersionParts(a), parseVersionParts(b));
}

function isPrereleaseBase(version: string): boolean {
  const core = version.split('+')[0] ?? version;
  return core.includes('-');
}

export async function castlabsReleaseTagExists(
  electronVersion: string,
): Promise<boolean> {
  try {
    await axios.get(`${CASTLABS_RELEASE_TAG_BASE}${electronVersion}`, {
      validateStatus: (status) => status === 200,
    });
    return true;
  } catch {
    return false;
  }
}

async function listCastlabsReleaseTags(suffix: string): Promise<string[]> {
  const tags: string[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const { data } = await axios.get<
      Array<{ tag_name?: string }>
    >(CASTLABS_RELEASES_API, {
      params: { per_page: 100, page },
    });
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }
    for (const release of data) {
      const tagName = release.tag_name?.replace(/^v/, '');
      if (tagName?.endsWith(suffix)) {
        tags.push(tagName);
      }
    }
    if (data.length < 100) {
      break;
    }
  }
  return tags;
}

function stripWidevineSuffix(tag: string, suffix: string): string {
  return tag.endsWith(suffix) ? tag.slice(0, -suffix.length) : tag;
}

/**
 * Resolves a castLabs Electron version for Widevine builds.
 * Uses the requested version when published; otherwise the newest stable
 * release with the same major version (e.g. 42.1.0 → 42.0.0+wvcus).
 */
export async function resolveWidevineElectronVersion(
  requestedBaseVersion: string,
  suffix: string,
): Promise<string> {
  const exact = `${requestedBaseVersion}${suffix}`;
  if (await castlabsReleaseTagExists(exact)) {
    return exact;
  }

  const requestedMajor = parseInt(requestedBaseVersion.split('.')[0] ?? '', 10);
  const tags = await listCastlabsReleaseTags(suffix);
  const sameMajor = tags
    .map((tag) => stripWidevineSuffix(tag, suffix))
    .filter((base) => parseInt(base.split('.')[0] ?? '', 10) === requestedMajor);

  const stable = sameMajor.filter((base) => !isPrereleaseBase(base));
  const candidates = stable.length > 0 ? stable : sameMajor;
  if (candidates.length === 0) {
    throw new Error(
      `\nERROR: No castLabs Electron release found for major ${requestedMajor} with suffix "${suffix}". \nRequested "${exact}". \nVerify versions at https://github.com/castlabs/electron-releases/releases. \nAborting.`,
    );
  }

  candidates.sort((a, b) => compareElectronBaseVersions(b, a));
  const resolvedBase = candidates[0];
  const resolved = `${resolvedBase}${suffix}`;

  if (resolvedBase !== requestedBaseVersion) {
    log.warn(
      `\nATTENTION: castLabs has no "${exact}".`,
      `Using nearest Widevine build "${resolved}" instead.`,
    );
  }

  if (!(await castlabsReleaseTagExists(resolved))) {
    throw new Error(
      `\nERROR: castLabs Electron version "${resolved}" does not exist. \nVerify versions at https://github.com/castlabs/electron-releases/releases. \nAborting.`,
    );
  }

  return resolved;
}
