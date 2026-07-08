/**
 * Cross-layer contract constants shared by build-time (`src/`) and runtime (`app/src/`).
 * Transport between layers is JSON on disk, not TypeScript imports across `src` ↔ `app`.
 */

/**
 * Config file written by the builder and read by the packaged Electron app.
 * Keep in sync with `src/buildTimeContract.ts` (published CLI cannot import this file).
 */
export const WEBHOLM_JSON_FILENAME = 'webholm.json' as const;

/** Legacy config filename from upstream Nativefier; read-only fallback for upgrade. */
export const LEGACY_NATIVEFIER_JSON_FILENAME = 'nativefier.json' as const;

/** @deprecated Use {@link LEGACY_NATIVEFIER_JSON_FILENAME}. */
export const NATIVEFIER_JSON_FILENAME = LEGACY_NATIVEFIER_JSON_FILENAME;
