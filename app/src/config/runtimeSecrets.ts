import type { OutputOptions, WindowOptions } from '../runtimeContract';

/** Keys that must not reach renderer IPC or rewritten webholm.json on disk. */
export const SENSITIVE_OUTPUT_OPTION_KEYS = [
  'basicAuthPassword',
  'basicAuthUsername',
  'processEnvs',
] as const;

export type SensitiveOutputOptionKey =
  (typeof SENSITIVE_OUTPUT_OPTION_KEYS)[number];

/** Subset of runtime config safe to log in the renderer via the `params` IPC channel. */
export type RendererParams = Pick<
  WindowOptions,
  | 'name'
  | 'targetUrl'
  | 'zoom'
  | 'blockExternalUrls'
  | 'insecure'
  | 'strictInternalUrls'
  | 'autoHideMenuBar'
  | 'userAgent'
  | 'internalUrls'
  | 'tabbingIdentifier'
> & {
  webholmVersion?: string;
  buildDate?: number;
};

const RENDERER_PARAM_KEYS: (keyof RendererParams)[] = [
  'name',
  'targetUrl',
  'zoom',
  'blockExternalUrls',
  'insecure',
  'strictInternalUrls',
  'autoHideMenuBar',
  'userAgent',
  'internalUrls',
  'tabbingIdentifier',
  'webholmVersion',
  'buildDate',
];

export function stripSensitiveOutputOptions(
  options: OutputOptions,
): OutputOptions {
  const stripped = { ...options };
  for (const key of SENSITIVE_OUTPUT_OPTION_KEYS) {
    delete stripped[key];
  }
  return stripped;
}

export function pickRendererParams(options: WindowOptions): RendererParams {
  const source = options as Record<string, unknown>;
  const picked: Partial<RendererParams> = {};
  for (const key of RENDERER_PARAM_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      picked[key] = value as never;
    }
  }
  return picked as RendererParams;
}

export function serializeRendererParams(options: WindowOptions): string {
  return JSON.stringify(pickRendererParams(options));
}
