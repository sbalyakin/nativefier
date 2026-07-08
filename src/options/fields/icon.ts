import * as log from 'loglevel';

import { logBuildStep } from '../../build/buildProgress';
import { inferIcon } from '../../infer/inferIcon';

type IconParams = {
  packager: {
    icon?: string;
    targetUrl: string;
    platform?: string;
  };
};

export async function icon(options: IconParams): Promise<string | undefined> {
  if (options.packager.icon) {
    logBuildStep(
      options.packager.targetUrl,
      `Using icon from --icon: ${options.packager.icon}`,
    );
    return undefined;
  }

  if (!options.packager.platform) {
    log.error('No platform specified. Icon can not be inferrerd.');
    return undefined;
  }

  try {
    return await inferIcon(
      options.packager.targetUrl,
      options.packager.platform,
    );
  } catch (err: unknown) {
    // eslint-disable-next-line
    const errorUrl: string = (err as any)?.config?.url;
    log.warn(
      'Cannot automatically retrieve the app icon:',
      errorUrl ? `${(err as Error).message} on ${errorUrl}` : err,
    );
    return undefined;
  }
}
