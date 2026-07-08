import fs from 'fs';

import * as log from '../helpers/loggingHelper';
import { IS_PLAYWRIGHT, PLAYWRIGHT_CONFIG } from '../helpers/playwrightHelpers';
import type { OutputOptions } from '../../../shared/src/options/model';
import { recentTestBuildDate } from '../../../shared/lib/src/contract/testFixtures';
import { getRuntimeConfigPath } from './runtimeConfigPath';
import {
  assertValidOutputOptions,
  normalizeLegacyOutputConfig,
} from './validateOutputOptions';

/** Defaults for PLAYWRIGHT_CONFIG env (partial overrides only). */
export const PLAYWRIGHT_RUNTIME_CONFIG_DEFAULTS = {
  name: 'PlaywrightTest',
  targetUrl: 'about:blank',
  webholmVersion: '0.0.0-test',
  buildDate: recentTestBuildDate(),
  blockExternalUrls: false,
  disableDevTools: false,
  disableOldBuildWarning: true,
  isUpgrade: false,
  strictInternalUrls: false,
  oldBuildWarningText: '',
} as const satisfies Partial<OutputOptions>;

export function mergePlaywrightRuntimeDefaults(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  return { ...PLAYWRIGHT_RUNTIME_CONFIG_DEFAULTS, ...partial };
}

export function parseRuntimeConfigJson(
  json: string,
  options?: { applyPlaywrightDefaults?: boolean },
): OutputOptions {
  const parsed: unknown = JSON.parse(json);
  const normalized =
    parsed !== null && typeof parsed === 'object'
      ? normalizeLegacyOutputConfig(parsed)
      : parsed;
  const candidate =
    options?.applyPlaywrightDefaults &&
    normalized !== null &&
    typeof normalized === 'object'
      ? mergePlaywrightRuntimeDefaults(normalized as Record<string, unknown>)
      : normalized;
  assertValidOutputOptions(candidate);
  return candidate;
}

export function loadRuntimeConfigFromSource(
  source: string,
  options?: { applyPlaywrightDefaults?: boolean },
): OutputOptions {
  return parseRuntimeConfigJson(source, options);
}

export function extractHttpUrlFromArgv(
  argv: string[] = process.argv,
): string | undefined {
  const urlArgv = argv.filter((a) => a.startsWith('http'));
  if (urlArgv.length === 0) {
    return undefined;
  }

  const maybeUrl = urlArgv[0];
  try {
    new URL(maybeUrl);
    return maybeUrl;
  } catch {
    return undefined;
  }
}

export function applyCommandLineTargetUrlOverride(
  config: OutputOptions,
  argv: string[] = process.argv,
): OutputOptions {
  const maybeUrl = extractHttpUrlFromArgv(argv);
  if (!maybeUrl) {
    return config;
  }

  log.info('Loading override URL passed as argument:', maybeUrl);
  return { ...config, targetUrl: maybeUrl };
}

export function loadRuntimeConfig(): OutputOptions {
  const usePlaywrightEnv = IS_PLAYWRIGHT && Boolean(PLAYWRIGHT_CONFIG);
  const json = usePlaywrightEnv
    ? PLAYWRIGHT_CONFIG!
    : fs.readFileSync(getRuntimeConfigPath(), 'utf8');

  const config = loadRuntimeConfigFromSource(json, {
    applyPlaywrightDefaults: usePlaywrightEnv,
  });
  const withOverrides = applyCommandLineTargetUrlOverride(config);
  log.debug('appArgs', withOverrides);
  return withOverrides;
}
