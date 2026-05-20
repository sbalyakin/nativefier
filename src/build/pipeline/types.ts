import type { AppOptions, RawOptions } from '../../buildTimeContract';

export type ResolvedBuildOptions = {
  rawOptions: RawOptions;
  options: AppOptions;
  finalOutDirectory: string;
};

export type PreparedTemplate = {
  templatePath: string;
  options: AppOptions;
};

export type PackagedAppResult = {
  appPath: string;
};
