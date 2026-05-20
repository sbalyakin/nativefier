import type {
  OutputOptions,
  TrayValue,
} from '../../../shared/src/options/model';

/** Keep in sync with `shared/src/contract.ts`. */
const NATIVEFIER_JSON_FILENAME = 'nativefier.json';

const TRAY_VALUES: readonly TrayValue[] = ['true', 'false', 'start-in-tray'];

const REQUIRED_STRING_FIELDS = [
  'name',
  'targetUrl',
  'nativefierVersion',
] as const;

const REQUIRED_BOOLEAN_FIELDS = [
  'blockExternalUrls',
  'disableDevTools',
  'isUpgrade',
  'strictInternalUrls',
] as const;

export type OutputOptionsValidationError = {
  field: string;
  message: string;
};

export function validateOutputOptions(
  value: unknown,
): OutputOptionsValidationError[] {
  if (value === null || typeof value !== 'object') {
    return [{ field: '', message: 'Config must be a JSON object' }];
  }

  const record = value as Record<string, unknown>;
  const errors: OutputOptionsValidationError[] = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    const raw = record[field];
    if (typeof raw !== 'string' || raw.length === 0) {
      errors.push({
        field,
        message: `${field} must be a non-empty string`,
      });
    }
  }

  const targetUrl = record.targetUrl;
  if (typeof targetUrl === 'string') {
    try {
      new URL(targetUrl);
    } catch {
      errors.push({
        field: 'targetUrl',
        message: 'targetUrl must be a valid URL',
      });
    }
  }

  const buildDate = record.buildDate;
  if (typeof buildDate !== 'number' || !Number.isFinite(buildDate)) {
    errors.push({
      field: 'buildDate',
      message: 'buildDate must be a finite number',
    });
  }

  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    if (typeof record[field] !== 'boolean') {
      errors.push({ field, message: `${field} must be a boolean` });
    }
  }

  if (typeof record.oldBuildWarningText !== 'string') {
    errors.push({
      field: 'oldBuildWarningText',
      message: 'oldBuildWarningText must be a string',
    });
  }

  const tray = record.tray;
  if (
    tray !== undefined &&
    (typeof tray !== 'string' || !TRAY_VALUES.includes(tray as TrayValue))
  ) {
    errors.push({
      field: 'tray',
      message: `tray must be one of: ${TRAY_VALUES.join(', ')}`,
    });
  }

  return errors;
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
