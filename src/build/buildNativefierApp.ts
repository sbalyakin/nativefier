import * as log from 'loglevel';

import type { RawOptions } from '../buildTimeContract';
import { applyUpgradeIfNeeded } from './pipeline/applyUpgradeIfNeeded';
import { finalizeBuild } from './pipeline/finalizeBuild';
import { packageElectronApp } from './pipeline/packageElectronApp';
import { prepareAssets } from './pipeline/prepareAssets';
import { prepareTemplate } from './pipeline/prepareTemplate';
import { resolveBuildOptions } from './pipeline/resolveBuildOptions';

export async function buildNativefierApp(
  rawOptions: RawOptions,
): Promise<string> {
  if (!rawOptions.quiet) {
    log.warn(
      '\n\n    Hi! Nativefier is minimally maintained these days, and needs more hands.\n' +
        '    If you have the time & motivation, help with bugfixes and maintenance is VERY welcome.\n' +
        '    Please go to https://github.com/nativefier/nativefier and help how you can. Thanks.\n\n',
    );
  }

  log.info('\nProcessing options...');
  const resolved = await resolveBuildOptions(rawOptions);
  const { templatePath, options } = await prepareTemplate(resolved.options);
  await prepareAssets(options, templatePath, resolved.rawOptions);
  const packaged = await packageElectronApp(options);
  log.info('\nFinalizing build...');
  const appPath = await applyUpgradeIfNeeded(
    packaged.appPath,
    options,
    resolved.finalOutDirectory,
  );
  return finalizeBuild(appPath, options);
}
