import fs from 'fs';

import * as log from '../helpers/loggingHelper';
import { IS_PLAYWRIGHT, PLAYWRIGHT_CONFIG } from '../helpers/playwrightHelpers';
import type { OutputOptions } from '../../../shared/src/options/model';
import { getRuntimeConfigPath } from './runtimeConfigPath';
import { assertValidOutputOptions } from './validateOutputOptions';

/** Defaults for PLAYWRIGHT_CONFIG env (partial overrides only). */
export const PLAYWRIGHT_RUNTIME_CONFIG_DEFAULTS = {
  name: 'PlaywrightTest',
  targetUrl: 'about:blank',
  nativefierVersion: '0.0.0-test',
  buildDate: 1_700_000_000_000,
  blockExternalUrls: false,
  disableDevTools: false,
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
  const candidate =
    options?.applyPlaywrightDefaults &&
    parsed !== null &&
    typeof parsed === 'object'
      ? mergePlaywrightRuntimeDefaults(parsed as Record<string, unknown>)
      : parsed;
  assertValidOutputOptions(candidate);
  return candidate;
}

export function loadRuntimeConfigFromSource(
  source: string,
  options?: { applyPlaywrightDefaults?: boolean },
): OutputOptions {
  return parseRuntimeConfigJson(source, options);
}

export function applyCommandLineTargetUrlOverride(
  config: OutputOptions,
  argv: string[] = process.argv,
): OutputOptions {
  const urlArgv = argv.filter((a) => a.startsWith('http'));
  if (urlArgv.length === 0) {
    return config;
  }

  const maybeUrl = urlArgv[0];
  try {
    new URL(maybeUrl);
    log.info('Loading override URL passed as argument:', maybeUrl);
    return { ...config, targetUrl: maybeUrl };
  } catch (err: unknown) {
    log.error(
      'Not loading override URL passed as argument, because failed to parse:',
      maybeUrl,
      err,
    );
    return config;
  }
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
