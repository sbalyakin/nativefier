import 'source-map-support/register';

import { buildWebholmApp } from './build/buildWebholmApp';
import { RawOptions } from './buildTimeContract';

export { buildWebholmApp };

/** @deprecated Use {@link buildWebholmApp}. */
export { buildNativefierApp } from './build/buildWebholmApp';

/**
 * Only for compatibility with Nativefier <= 7.7.1 !
 * Use the better, modern async `buildWebholmApp` instead if you can!
 */
function buildWebholmAppOldCallbackStyle(
  options: RawOptions,
  callback: (err?: Error, result?: string) => void,
): void {
  buildWebholmApp(options)
    .then((result) => callback(undefined, result))
    .catch((err: Error) => callback(err));
}

/** @deprecated Use {@link buildWebholmApp}. */
export default buildWebholmAppOldCallbackStyle;
