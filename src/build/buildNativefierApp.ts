import * as log from 'loglevel';

import type { RawOptions } from '../buildTimeContract';
import { applyUpgradeIfNeeded } from './pipeline/applyUpgradeIfNeeded';
import { finalizeBuild } from './pipeline/finalizeBuild';
import { flattenPackagerOutput } from './pipeline/flattenPackagerOutput';
import { packageElectronApp } from './pipeline/packageElectronApp';
import { prepareAssets } from './pipeline/prepareAssets';
import { prepareTemplate } from './pipeline/prepareTemplate';
import { resolveBuildOptions } from './pipeline/resolveBuildOptions';

export async function buildNativefierApp(
  rawOptions: RawOptions,
): Promise<string> {
  log.info('\nProcessing options...');
  const resolved = await resolveBuildOptions(rawOptions);
  const { templatePath, options } = await prepareTemplate(resolved.options);
  await prepareAssets(options, templatePath, resolved.rawOptions);
  const packaged = await packageElectronApp(options);
  const flattenedAppPath = resolved.rawOptions.plain
    ? await flattenPackagerOutput(packaged.appPath, options)
    : packaged.appPath;
  log.info('\nFinalizing build...');
  const appPath = await applyUpgradeIfNeeded(
    flattenedAppPath,
    options,
    resolved.finalOutDirectory,
  );
  return finalizeBuild(appPath, options);
}
