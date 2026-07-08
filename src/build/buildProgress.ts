import * as log from 'loglevel';

import { getHostnameFromUrl } from '../helpers/urlHelpers';

export function buildLabel(targetUrl: string): string {
  return getHostnameFromUrl(targetUrl) ?? 'app';
}

export function logBuildStep(targetUrl: string, message: string): void {
  log.info(`[${buildLabel(targetUrl)}] ${message}`);
}
