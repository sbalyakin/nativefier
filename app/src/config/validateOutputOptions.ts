import type { OutputOptions } from '../../../shared/src/options/model';
import {
  validateNativefierJsonContract,
  type OutputOptionsValidationError,
} from '../../../shared/lib/src/contract/nativefierJsonContract';

/** Keep in sync with `shared/src/contract.ts`. */
const NATIVEFIER_JSON_FILENAME = 'nativefier.json';

export type { OutputOptionsValidationError };

export function validateOutputOptions(
  value: unknown,
): OutputOptionsValidationError[] {
  return validateNativefierJsonContract(value);
}

export function assertValidOutputOptions(
  value: unknown,
): asserts value is OutputOptions {
  const errors = validateOutputOptions(value);
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new Error(`Invalid ${NATIVEFIER_JSON_FILENAME}: ${detail}`);
  }
}
