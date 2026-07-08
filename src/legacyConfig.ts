/**
 * Legacy config normalization for the published CLI (`lib/` only at runtime).
 * Keep in sync with `shared/src/contract/webholmJsonContract.ts`.
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
