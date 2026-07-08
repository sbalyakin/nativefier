import type { OutputOptions } from '../../../shared/src/options/model';
import {
  normalizeLegacyOutputConfig,
  validateWebholmJsonContract,
  type OutputOptionsValidationError,
} from '../../../shared/lib/src/contract/webholmJsonContract';
import {
  LEGACY_NATIVEFIER_JSON_FILENAME,
  WEBHOLM_JSON_FILENAME,
} from './runtimeConfigPath';

export type { OutputOptionsValidationError };

export function validateOutputOptions(
  value: unknown,
): OutputOptionsValidationError[] {
  return validateWebholmJsonContract(value);
}

export function assertValidOutputOptions(
  value: unknown,
): asserts value is OutputOptions {
  const errors = validateOutputOptions(value);
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new Error(
      `Invalid ${WEBHOLM_JSON_FILENAME} (or legacy ${LEGACY_NATIVEFIER_JSON_FILENAME}): ${detail}`,
    );
  }
}

export { normalizeLegacyOutputConfig };
