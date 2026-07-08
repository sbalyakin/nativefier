import * as log from 'loglevel';

import { logBuildStep } from '../../build/buildProgress';
import { sanitizeFilename } from '../../utils/sanitizeFilename';
import { inferTitle } from '../../infer/inferTitle';
import { DEFAULT_APP_NAME } from '../../constants';
import {
  getAppNameFromHostname,
  getHostnameFromUrl,
} from '../../helpers/urlHelpers';

type NameParams = {
  packager: {
    name?: string;
    platform?: string;
    targetUrl: string;
  };
};

async function tryToInferName(targetUrl: string): Promise<string> {
  try {
    logBuildStep(targetUrl, 'Reading page title...');
    const pageTitle = await inferTitle(targetUrl);
    return pageTitle || DEFAULT_APP_NAME;
  } catch (err: unknown) {
    const hostname = getHostnameFromUrl(targetUrl);
    if (hostname) {
      const nameFromHostname = getAppNameFromHostname(hostname);
      logBuildStep(
        targetUrl,
        `Page did not respond, using app name "${nameFromHostname}" from hostname.`,
      );
      log.warn(
        `Unable to automatically determine app name from page title, using '${nameFromHostname}' from hostname.`,
        err,
      );
      return nameFromHostname;
    }
    log.warn(
      `Unable to automatically determine app name, falling back to '${DEFAULT_APP_NAME}'.`,
      err,
    );
    return DEFAULT_APP_NAME;
  }
}

export async function name(options: NameParams): Promise<string> {
  let name: string | undefined = options.packager.name;
  if (!name) {
    name = await tryToInferName(options.packager.targetUrl);
  }

  return sanitizeFilename(options.packager.platform, name);
}
