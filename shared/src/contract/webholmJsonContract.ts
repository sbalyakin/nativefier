import type { TrayValue } from '../options/model';

/** Fields the runtime loader requires in every packaged {@link WEBHOLM_JSON_FILENAME}. */
export const RUNTIME_REQUIRED_STRING_FIELDS = [
  'name',
  'targetUrl',
  'webholmVersion',
] as const;

export const RUNTIME_REQUIRED_BOOLEAN_FIELDS = [
  'blockExternalUrls',
  'disableDevTools',
  'isUpgrade',
  'strictInternalUrls',
] as const;

/** Fields the builder always injects when writing webholm.json (not from OUTPUT_FIELD_MAPPINGS). */
export const BUILDER_INJECTED_OUTPUT_FIELDS = [
  'buildDate',
  'name',
  'oldBuildWarningText',
] as const;

export const TRAY_VALUES: readonly TrayValue[] = [
  'true',
  'false',
  'start-in-tray',
];

export type OutputOptionsValidationError = {
  field: string;
  message: string;
};

/**
 * Maps legacy upstream Nativefier config fields into Webholm shape before validation.
 */
export function normalizeLegacyOutputConfig(
  value: unknown,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return {};
  }
  const record = { ...(value as Record<string, unknown>) };
  if (
    (record.webholmVersion === undefined ||
      (typeof record.webholmVersion === 'string' &&
        record.webholmVersion.length === 0)) &&
    typeof record.nativefierVersion === 'string' &&
    record.nativefierVersion.length > 0
  ) {
    record.webholmVersion = record.nativefierVersion;
  }
  return record;
}

/**
 * Validates the JSON shape written by the builder and read at runtime.
 * Shared so build-time and runtime contract tests use one ruleset.
 */
export function validateWebholmJsonContract(
  value: unknown,
): OutputOptionsValidationError[] {
  const record = normalizeLegacyOutputConfig(value);
  if (value === null || typeof value !== 'object') {
    return [{ field: '', message: 'Config must be a JSON object' }];
  }

  const errors: OutputOptionsValidationError[] = [];

  for (const field of RUNTIME_REQUIRED_STRING_FIELDS) {
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

  for (const field of RUNTIME_REQUIRED_BOOLEAN_FIELDS) {
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

/** @deprecated Use {@link validateWebholmJsonContract}. */
export function validateNativefierJsonContract(
  value: unknown,
): OutputOptionsValidationError[] {
  return validateWebholmJsonContract(value);
}
