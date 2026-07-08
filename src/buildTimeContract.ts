/**
 * Build-time contract entrypoint for CLI and builder code under `src/`.
 *
 * Import option types and cross-layer constants from here, never from `app/src/`.
 * Runtime behavior belongs in the packaged app; configuration crosses the boundary
 * only via {@link WEBHOLM_JSON_FILENAME} on disk.
 *
 * Value exports here must not re-export from `shared/lib` at runtime: the published
 * npm package ships only `lib/`, not `shared/lib`. Keep {@link WEBHOLM_JSON_FILENAME}
 * in sync with `shared/src/contract.ts`.
 */
export const WEBHOLM_JSON_FILENAME = 'webholm.json' as const;

/** Legacy config filename from upstream Nativefier; read-only fallback for upgrade. */
export const LEGACY_NATIVEFIER_JSON_FILENAME = 'nativefier.json' as const;

/** @deprecated Use {@link LEGACY_NATIVEFIER_JSON_FILENAME}. */
export const NATIVEFIER_JSON_FILENAME = LEGACY_NATIVEFIER_JSON_FILENAME;

export type {
  AppOptions,
  ElectronPackagerOptions,
  GlobalShortcut,
  NativefierOptions,
  OutputOptions,
  PackageJSON,
  RawOptions,
  TitleBarValue,
  TrayValue,
  WebholmOptions,
} from '../shared/src/options/model';
