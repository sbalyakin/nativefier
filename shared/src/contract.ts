/**
 * Cross-layer contract constants shared by build-time (`src/`) and runtime (`app/src/`).
 * Transport between layers is JSON on disk, not TypeScript imports across `src` ↔ `app`.
 */

/**
 * Config file written by the builder and read by the packaged Electron app.
 * Keep in sync with `src/buildTimeContract.ts` (published CLI cannot import this file).
 */
export const NATIVEFIER_JSON_FILENAME = 'nativefier.json' as const;
