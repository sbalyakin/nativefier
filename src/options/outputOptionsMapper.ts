import type { AppOptions, OutputOptions } from '../buildTimeContract';
import { DEFAULT_APP_NAME } from '../constants';

type OutputFieldMapping = {
  outputKey: keyof OutputOptions;
  source: 'packager' | 'webholm';
  /** AppOptions field name when it differs from the output key. */
  sourceField?: string;
};

/**
 * AppOptions → webholm.json ({@link OutputOptions}) field wiring.
 * Same-name packager/webholm fields are listed explicitly so the contract stays auditable.
 */
export const OUTPUT_FIELD_MAPPINGS: readonly OutputFieldMapping[] = [
  { outputKey: 'accessibilityPrompt', source: 'webholm' },
  { outputKey: 'alwaysOnTop', source: 'webholm' },
  { outputKey: 'appBundleId', source: 'packager' },
  { outputKey: 'appCategoryType', source: 'packager' },
  { outputKey: 'appCopyright', source: 'packager' },
  { outputKey: 'appVersion', source: 'packager' },
  { outputKey: 'arch', source: 'packager' },
  { outputKey: 'asar', source: 'packager' },
  { outputKey: 'backgroundColor', source: 'webholm' },
  { outputKey: 'basicAuthPassword', source: 'webholm' },
  { outputKey: 'basicAuthUsername', source: 'webholm' },
  { outputKey: 'blockExternalUrls', source: 'webholm' },
  { outputKey: 'bounce', source: 'webholm' },
  { outputKey: 'browserwindowOptions', source: 'webholm' },
  { outputKey: 'buildVersion', source: 'packager' },
  { outputKey: 'clearCache', source: 'webholm' },
  { outputKey: 'counter', source: 'webholm' },
  { outputKey: 'crashReporter', source: 'webholm' },
  { outputKey: 'darwinDarkModeSupport', source: 'packager' },
  { outputKey: 'derefSymlinks', source: 'packager' },
  { outputKey: 'disableContextMenu', source: 'webholm' },
  { outputKey: 'disableDevTools', source: 'webholm' },
  { outputKey: 'disableGpu', source: 'webholm' },
  { outputKey: 'disableOldBuildWarning', source: 'webholm' },
  { outputKey: 'diskCacheSize', source: 'webholm' },
  { outputKey: 'download', source: 'packager' },
  {
    outputKey: 'electronVersionUsed',
    source: 'packager',
    sourceField: 'electronVersion',
  },
  { outputKey: 'enableEs3Apis', source: 'webholm' },
  { outputKey: 'executableName', source: 'packager' },
  { outputKey: 'fastQuit', source: 'webholm' },
  { outputKey: 'fileDownloadOptions', source: 'webholm' },
  { outputKey: 'flashPluginDir', source: 'webholm' },
  { outputKey: 'fullScreen', source: 'webholm' },
  { outputKey: 'globalShortcuts', source: 'webholm' },
  { outputKey: 'height', source: 'webholm' },
  { outputKey: 'helperBundleId', source: 'packager' },
  { outputKey: 'hideWindowFrame', source: 'webholm' },
  { outputKey: 'ignoreCertificate', source: 'webholm' },
  { outputKey: 'ignoreGpuBlacklist', source: 'webholm' },
  { outputKey: 'insecure', source: 'webholm' },
  { outputKey: 'internalUrls', source: 'webholm' },
  { outputKey: 'isUpgrade', source: 'packager', sourceField: 'upgrade' },
  { outputKey: 'junk', source: 'packager' },
  { outputKey: 'lang', source: 'webholm' },
  { outputKey: 'maximize', source: 'webholm' },
  { outputKey: 'maxHeight', source: 'webholm' },
  { outputKey: 'maxWidth', source: 'webholm' },
  { outputKey: 'minHeight', source: 'webholm' },
  { outputKey: 'minWidth', source: 'webholm' },
  { outputKey: 'webholmVersion', source: 'webholm' },
  { outputKey: 'osxNotarize', source: 'packager' },
  { outputKey: 'osxSign', source: 'packager' },
  { outputKey: 'portable', source: 'packager' },
  { outputKey: 'persistSessionCookies', source: 'webholm' },
  { outputKey: 'processEnvs', source: 'webholm' },
  { outputKey: 'protocols', source: 'packager' },
  { outputKey: 'proxyRules', source: 'webholm' },
  { outputKey: 'prune', source: 'packager' },
  { outputKey: 'quiet', source: 'packager' },
  { outputKey: 'showMenuBar', source: 'webholm' },
  { outputKey: 'singleInstance', source: 'webholm' },
  { outputKey: 'strictInternalUrls', source: 'webholm' },
  { outputKey: 'targetUrl', source: 'packager' },
  { outputKey: 'titleBarStyle', source: 'webholm' },
  { outputKey: 'tray', source: 'webholm' },
  { outputKey: 'usageDescription', source: 'packager' },
  { outputKey: 'userAgent', source: 'webholm' },
  { outputKey: 'userAgentHonest', source: 'webholm' },
  { outputKey: 'versionString', source: 'webholm' },
  { outputKey: 'width', source: 'webholm' },
  { outputKey: 'widevine', source: 'webholm' },
  { outputKey: 'win32metadata', source: 'packager' },
  { outputKey: 'x', source: 'webholm' },
  { outputKey: 'y', source: 'webholm' },
  { outputKey: 'zoom', source: 'webholm' },
];

function readAppOptionsField(
  options: AppOptions,
  source: 'packager' | 'webholm',
  field: string,
): unknown {
  const bucket = options[source] as Record<string, unknown>;
  return bucket[field];
}

/**
 * Maps normalized {@link AppOptions} into the JSON written as webholm.json.
 */
export function mapAppOptionsToOutputOptions(
  options: AppOptions,
): OutputOptions {
  const output = {} as OutputOptions;

  for (const { outputKey, source, sourceField } of OUTPUT_FIELD_MAPPINGS) {
    const field = sourceField ?? (outputKey as string);
    const value = readAppOptionsField(options, source, field);
    if (value !== undefined) {
      (output as Record<string, unknown>)[outputKey as string] = value;
    }
  }

  output.buildDate = new Date().getTime();
  output.name = options.packager.name || DEFAULT_APP_NAME;
  output.oldBuildWarningText = process.env.OLD_BUILD_WARNING_TEXT || '';

  return output;
}
