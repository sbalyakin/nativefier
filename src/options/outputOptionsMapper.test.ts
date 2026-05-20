import type { AppOptions } from '../buildTimeContract';
import { DEFAULT_APP_NAME } from '../constants';
import {
  OUTPUT_FIELD_MAPPINGS,
  mapAppOptionsToOutputOptions,
} from './outputOptionsMapper';

const minimalAppOptions = (): AppOptions =>
  ({
    packager: {
      arch: 'x64',
      dir: '/tmp/app',
      name: '',
      platform: 'darwin',
      portable: false,
      targetUrl: 'https://example.com/',
      upgrade: false,
      electronVersion: '42.1.0',
      quiet: true,
    },
    nativefier: {
      accessibilityPrompt: true,
      alwaysOnTop: false,
      blockExternalUrls: false,
      bounce: false,
      clearCache: false,
      counter: false,
      disableContextMenu: false,
      disableDevTools: false,
      disableGpu: false,
      disableOldBuildWarning: false,
      enableEs3Apis: false,
      fastQuit: false,
      fullScreen: false,
      hideWindowFrame: false,
      ignoreCertificate: false,
      ignoreGpuBlacklist: false,
      inject: [],
      insecure: false,
      maximize: false,
      nativefierVersion: '1.0.0',
      showMenuBar: false,
      singleInstance: false,
      strictInternalUrls: false,
      tray: 'false',
      userAgentHonest: false,
      verbose: false,
      widevine: false,
      zoom: 1,
    },
  }) as AppOptions;

test('OUTPUT_FIELD_MAPPINGS covers renamed output keys', () => {
  const renamed = OUTPUT_FIELD_MAPPINGS.filter(
    (m) => m.sourceField !== undefined,
  ).map((m) => m.outputKey);
  expect(renamed.sort()).toEqual(['electronVersionUsed', 'isUpgrade'].sort());
});

test('mapAppOptionsToOutputOptions applies renames and defaults', () => {
  const options = minimalAppOptions();
  options.packager.upgrade = true;
  options.packager.name = undefined;
  const output = mapAppOptionsToOutputOptions(options);
  expect(output.electronVersionUsed).toBe('42.1.0');
  expect(output.isUpgrade).toBe(true);
  expect(output.name).toBe(DEFAULT_APP_NAME);

  options.packager.name = '';
  expect(mapAppOptionsToOutputOptions(options).name).toBe(DEFAULT_APP_NAME);
  expect(output.quiet).toBe(true);
  expect(typeof output.buildDate).toBe('number');
  expect(output.oldBuildWarningText).toBe('');
});
