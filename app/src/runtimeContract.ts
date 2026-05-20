/**
 * Runtime contract entrypoint for the packaged Electron app under `app/src/`.
 *
 * Import option types and cross-layer constants from here (or from `shared/src`),
 * never from `src/` (builder/CLI). The builder writes {@link NATIVEFIER_JSON_FILENAME};
 * runtime reads it at startup (see `components/mainWindow.ts`).
 */
export { NATIVEFIER_JSON_FILENAME } from '../../shared/src/contract';
export type {
  BrowserWindowOptions,
  OutputOptions,
  TrayValue,
  WindowOptions,
} from '../../shared/src/options/model';
export { outputOptionsToWindowOptions } from '../../shared/src/options/model';
