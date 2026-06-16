import * as log from 'loglevel';

import { normalizeUrl as normalizeUrlShared } from '../../shared/lib/src/options/normalizeUrl';

export function normalizeUrl(urlToNormalize: string): string {
  try {
    const normalizedUrl = normalizeUrlShared(urlToNormalize);
    log.debug(`Normalized URL ${urlToNormalize} to:`, normalizedUrl);
    return normalizedUrl;
  } catch (err: unknown) {
    log.error('normalizeUrl ERROR', err);
    throw err;
  }
}
