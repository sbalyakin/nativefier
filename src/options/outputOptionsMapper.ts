import type { AppOptions, OutputOptions } from '../buildTimeContract';
import { DEFAULT_APP_NAME } from '../constants';

type OutputFieldMapping = {
  outputKey: keyof OutputOptions;
  source: 'packager' | 'nativefier';
  /** AppOptions field name when it differs from the output key. */
  sourceField?: string;
};

/**
 * AppOptions → nativefier.json ({@link OutputOptions}) field wiring.
 * Same-name packager/nativefier fields are listed explicitly so the contract stays auditable.
 */
export const OUTPUT_FIELD_MAPPINGS: readonly OutputFieldMapping[] = [
  { outputKey: 'accessibilityPrompt', source: 'nativefier' },
  { outputKey: 'alwaysOnTop', source: 'nativefier' },
  { outputKey: 'appBundleId', source: 'packager' },
  { outputKey: 'appCategoryType', source: 'packager' },
  { outputKey: 'appCopyright', source: 'packager' },
  { outputKey: 'appVersion', source: 'packager' },
  { outputKey: 'arch', source: 'packager' },
  { outputKey: 'asar', source: 'packager' },
  { outputKey: 'backgroundColor', source: 'nativefier' },
  { outputKey: 'basicAuthPassword', source: 'nativefier' },
  { outputKey: 'basicAuthUsername', source: 'nativefier' },
  { outputKey: 'blockExternalUrls', source: 'nativefier' },
  { outputKey: 'bounce', source: 'nativefier' },
  { outputKey: 'browserwindowOptions', source: 'nativefier' },
  { outputKey: 'buildVersion', source: 'packager' },
  { outputKey: 'clearCache', source: 'nativefier' },
  { outputKey: 'counter', source: 'nativefier' },
  { outputKey: 'crashReporter', source: 'nativefier' },
  { outputKey: 'darwinDarkModeSupport', source: 'packager' },
  { outputKey: 'derefSymlinks', source: 'packager' },
  { outputKey: 'disableContextMenu', source: 'nativefier' },
  { outputKey: 'disableDevTools', source: 'nativefier' },
  { outputKey: 'disableGpu', source: 'nativefier' },
  { outputKey: 'disableOldBuildWarning', source: 'nativefier' },
  { outputKey: 'diskCacheSize', source: 'nativefier' },
  { outputKey: 'download', source: 'packager' },
  {
    outputKey: 'electronVersionUsed',
    source: 'packager',
    sourceField: 'electronVersion',
  },
  { outputKey: 'enableEs3Apis', source: 'nativefier' },
  { outputKey: 'executableName', source: 'packager' },
  { outputKey: 'fastQuit', source: 'nativefier' },
  { outputKey: 'fileDownloadOptions', source: 'nativefier' },
  { outputKey: 'flashPluginDir', source: 'nativefier' },
  { outputKey: 'fullScreen', source: 'nativefier' },
  { outputKey: 'globalShortcuts', source: 'nativefier' },
  { outputKey: 'height', source: 'nativefier' },
  { outputKey: 'helperBundleId', source: 'packager' },
  { outputKey: 'hideWindowFrame', source: 'nativefier' },
  { outputKey: 'ignoreCertificate', source: 'nativefier' },
  { outputKey: 'ignoreGpuBlacklist', source: 'nativefier' },
  { outputKey: 'insecure', source: 'nativefier' },
  { outputKey: 'internalUrls', source: 'nativefier' },
  { outputKey: 'isUpgrade', source: 'packager', sourceField: 'upgrade' },
  { outputKey: 'junk', source: 'packager' },
  { outputKey: 'lang', source: 'nativefier' },
  { outputKey: 'maximize', source: 'nativefier' },
  { outputKey: 'maxHeight', source: 'nativefier' },
  { outputKey: 'maxWidth', source: 'nativefier' },
  { outputKey: 'minHeight', source: 'nativefier' },
  { outputKey: 'minWidth', source: 'nativefier' },
  { outputKey: 'nativefierVersion', source: 'nativefier' },
  { outputKey: 'osxNotarize', source: 'packager' },
  { outputKey: 'osxSign', source: 'packager' },
  { outputKey: 'portable', source: 'packager' },
  { outputKey: 'processEnvs', source: 'nativefier' },
  { outputKey: 'protocols', source: 'packager' },
  { outputKey: 'proxyRules', source: 'nativefier' },
  { outputKey: 'prune', source: 'packager' },
  { outputKey: 'quiet', source: 'packager' },
  { outputKey: 'showMenuBar', source: 'nativefier' },
  { outputKey: 'singleInstance', source: 'nativefier' },
  { outputKey: 'strictInternalUrls', source: 'nativefier' },
  { outputKey: 'targetUrl', source: 'packager' },
  { outputKey: 'titleBarStyle', source: 'nativefier' },
  { outputKey: 'tray', source: 'nativefier' },
  { outputKey: 'usageDescription', source: 'packager' },
  { outputKey: 'userAgent', source: 'nativefier' },
  { outputKey: 'userAgentHonest', source: 'nativefier' },
  { outputKey: 'versionString', source: 'nativefier' },
  { outputKey: 'width', source: 'nativefier' },
  { outputKey: 'widevine', source: 'nativefier' },
  { outputKey: 'win32metadata', source: 'packager' },
  { outputKey: 'x', source: 'nativefier' },
  { outputKey: 'y', source: 'nativefier' },
  { outputKey: 'zoom', source: 'nativefier' },
];

function readAppOptionsField(
  options: AppOptions,
  source: 'packager' | 'nativefier',
  field: string,
): unknown {
  const bucket = options[source] as Record<string, unknown>;
  return bucket[field];
}

/**
 * Maps normalized {@link AppOptions} into the JSON written as nativefier.json.
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
