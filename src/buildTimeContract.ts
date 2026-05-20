/**
 * Build-time contract entrypoint for CLI and builder code under `src/`.
 *
 * Import option types and cross-layer constants from here, never from `app/src/`.
 * Runtime behavior belongs in the packaged app; configuration crosses the boundary
 * only via {@link NATIVEFIER_JSON_FILENAME} on disk.
 *
 * Value exports here must not re-export from `shared/lib` at runtime: the published
 * npm package ships only `lib/`, not `shared/lib`. Keep {@link NATIVEFIER_JSON_FILENAME}
 * in sync with `shared/src/contract.ts`.
 */
export const NATIVEFIER_JSON_FILENAME = 'nativefier.json' as const;

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
} from '../shared/src/options/model';
