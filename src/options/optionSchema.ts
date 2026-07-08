import type { Options as YargsOptions } from 'yargs';
import type { Argv } from 'yargs';
import * as log from 'loglevel';

import {
  DEFAULT_ELECTRON_VERSION,
  ELECTRON_MAJOR_VERSION,
  PLACEHOLDER_APP_DIR,
} from '../constants';
import { getProcessEnvs } from '../helpers/helpers';
import {
  inferArch,
  supportedArchs,
  supportedPlatforms,
} from '../infer/inferOs';
import type { AppOptions, RawOptions } from '../buildTimeContract';
import { parseJson } from '../utils/parseUtils';
import { normalizeUrl } from './normalizeUrl';
import type { SupportedArch, Win32MetadataOptions } from '@electron/packager';

/** Where an option applies in the build/runtime pipeline. */
export type OptionScope = 'packager' | 'runtime' | 'cliOnly' | 'deprecated';

export type OptionValueType = 'string' | 'number' | 'boolean' | 'array';

export type OptionMapTarget = {
  namespace: 'packager' | 'nativefier';
  field: string;
};

export type OptionDefinition = {
  /** yargs `.option()` first argument (short or long flag). */
  cliFlag: string;
  alias?: string | readonly string[];
  scope: OptionScope;
  type: OptionValueType;
  description: string;
  /** camelCase key on {@link RawOptions} after yargs parsing. */
  rawKey?: string;
  /** Field under `AppOptions.packager` or `AppOptions.nativefier`. */
  targetField?: string;
  /**
   * Raw argv → AppOptions destination when `rawKey` differs from `targetField`
   * or when `scope` is `cliOnly` / `deprecated`.
   */
  mapTo?: OptionMapTarget;
  default?: unknown;
  defaultDescription?: string;
  choices?: readonly string[];
  normalize?: boolean;
  hidden?: boolean;
  deprecated?: boolean;
  coerce?: 'json' | 'processEnvs' | 'win32metadata';
  /** yargs help group title (without decorative equals signs). */
  yargsGroup?: string;
  /** Register on CLI; false for runtime-only defaults (e.g. accessibilityPrompt). */
  exposeOnCli?: boolean;
};

export const YARGS_GROUP_TITLES = {
  appCreation: 'App Creation Options',
  appWindow: 'App Window Options',
  internalBrowser: 'Internal Browser Options',
  internalBrowserCache: 'Internal Browser Cache Options',
  urlHandling: 'URL Handling Options',
  auth: 'Auth Options',
  graphics: 'Graphics Options',
  security: '(In)Security Options',
  flash: 'Flash Options (DEPRECATED)',
  platform: 'Platform-Specific Options',
  debug: 'Debug Options',
} as const;

function def(entry: OptionDefinition & { cliFlag: string }): OptionDefinition {
  return {
    exposeOnCli: entry.exposeOnCli ?? true,
    ...entry,
  };
}

/**
 * Single source of CLI metadata and RawOptions → AppOptions mapping.
 * TypeScript shapes stay in `shared/src/options/model.ts`.
 */
export const OPTION_DEFINITIONS: readonly OptionDefinition[] = [
  // --- App creation (packager) ---
  def({
    cliFlag: 'a',
    alias: 'arch',
    scope: 'packager',
    targetField: 'arch',
    rawKey: 'arch',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    defaultDescription: "current Node's arch",
    description: 'the CPU architecture to build for',
    choices: supportedArchs,
  }),
  def({
    cliFlag: 'c',
    alias: 'conceal',
    scope: 'cliOnly',
    rawKey: 'conceal',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    description: 'package the app source code into an asar archive',
  }),
  def({
    cliFlag: 'e',
    alias: 'electron-version',
    scope: 'packager',
    targetField: 'electronVersion',
    rawKey: 'electronVersion',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    defaultDescription: DEFAULT_ELECTRON_VERSION,
    description:
      "specify the electron version to use (without the 'v'); see https://github.com/electron/electron/releases",
  }),
  def({
    cliFlag: 'global-shortcuts',
    scope: 'runtime',
    targetField: 'globalShortcuts',
    rawKey: 'globalShortcuts',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    normalize: true,
    description:
      'define global keyboard shortcuts via a JSON file; See https://github.com/nativefier/nativefier/blob/master/API.md#global-shortcuts',
  }),
  def({
    cliFlag: 'i',
    alias: 'icon',
    scope: 'packager',
    targetField: 'icon',
    rawKey: 'icon',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    normalize: true,
    description:
      'the icon file to use as the icon for the app (.ico on Windows, .icns/.png on macOS, .png on Linux)',
  }),
  def({
    cliFlag: 'n',
    alias: 'name',
    scope: 'packager',
    targetField: 'name',
    rawKey: 'name',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    defaultDescription: 'the title of the page passed via targetUrl',
    description: 'specify the name of the app',
  }),
  def({
    cliFlag: 'no-overwrite',
    scope: 'cliOnly',
    rawKey: 'noOverwrite',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    description: 'do not overwrite output directory if it already exists',
  }),
  def({
    cliFlag: 'overwrite',
    scope: 'cliOnly',
    rawKey: 'overwrite',
    type: 'boolean',
    default: true,
    hidden: true,
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    description: 'internal flag paired with no-overwrite',
    exposeOnCli: true,
  }),
  def({
    cliFlag: 'plain',
    scope: 'cliOnly',
    rawKey: 'plain',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    description:
      'write the packaged app directly into the output directory instead of a {name}-{platform}-{arch} subfolder',
  }),
  def({
    cliFlag: 'p',
    alias: 'platform',
    scope: 'packager',
    targetField: 'platform',
    rawKey: 'platform',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    defaultDescription: 'current operating system',
    description: 'the operating system platform to build for',
    choices: supportedPlatforms,
  }),
  def({
    cliFlag: 'portable',
    scope: 'packager',
    targetField: 'portable',
    rawKey: 'portable',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    description:
      'make the app store its user data in the app folder; WARNING: see https://github.com/nativefier/nativefier/blob/master/API.md#portable for security risks',
  }),
  def({
    cliFlag: 'upgrade',
    scope: 'packager',
    rawKey: 'upgrade',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    normalize: true,
    description:
      'upgrade an app built by an older version of Nativefier\nYou must pass the full path to the existing app executable (app will be overwritten with upgraded version by default)',
  }),
  def({
    cliFlag: 'widevine',
    scope: 'runtime',
    targetField: 'widevine',
    rawKey: 'widevine',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appCreation,
    description:
      "use a Widevine-enabled version of Electron for DRM playback (use at your own risk, it's unofficial, provided by CastLabs)",
  }),

  // --- App window (runtime) ---
  def({
    cliFlag: 'always-on-top',
    scope: 'runtime',
    targetField: 'alwaysOnTop',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'enable always on top window',
  }),
  def({
    cliFlag: 'background-color',
    scope: 'runtime',
    targetField: 'backgroundColor',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description:
      "set the app background color, for better integration while the app is loading. Example value: '#2e2c29'",
  }),
  def({
    cliFlag: 'bookmarks-menu',
    scope: 'runtime',
    targetField: 'bookmarksMenu',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    normalize: true,
    description:
      'create a bookmarks menu (via JSON file); See https://github.com/nativefier/nativefier/blob/master/API.md#bookmarks-menu',
  }),
  def({
    cliFlag: 'browserwindow-options',
    scope: 'runtime',
    targetField: 'browserwindowOptions',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    coerce: 'json',
    description:
      'override Electron BrowserWindow options (via JSON string); see https://github.com/nativefier/nativefier/blob/master/API.md#browserwindow-options',
  }),
  def({
    cliFlag: 'disable-context-menu',
    scope: 'runtime',
    targetField: 'disableContextMenu',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'disable the context menu (right click)',
  }),
  def({
    cliFlag: 'disable-dev-tools',
    scope: 'runtime',
    targetField: 'disableDevTools',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'disable developer tools (Ctrl+Shift+I / F12)',
  }),
  def({
    cliFlag: 'full-screen',
    scope: 'runtime',
    targetField: 'fullScreen',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'always start the app full screen',
  }),
  def({
    cliFlag: 'height',
    scope: 'runtime',
    targetField: 'height',
    type: 'number',
    default: 800,
    defaultDescription: '800',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window default height in pixels',
  }),
  def({
    cliFlag: 'hide-window-frame',
    scope: 'runtime',
    targetField: 'hideWindowFrame',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'disable window frame and controls',
  }),
  def({
    cliFlag: 'm',
    alias: 'show-menu-bar',
    scope: 'runtime',
    targetField: 'showMenuBar',
    rawKey: 'showMenuBar',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set menu bar visible',
  }),
  def({
    cliFlag: 'max-height',
    scope: 'runtime',
    targetField: 'maxHeight',
    type: 'number',
    defaultDescription: 'unlimited',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window maximum height in pixels',
  }),
  def({
    cliFlag: 'max-width',
    scope: 'runtime',
    targetField: 'maxWidth',
    type: 'number',
    defaultDescription: 'unlimited',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window maximum width in pixels',
  }),
  def({
    cliFlag: 'maximize',
    scope: 'runtime',
    targetField: 'maximize',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'always start the app maximized',
  }),
  def({
    cliFlag: 'min-height',
    scope: 'runtime',
    targetField: 'minHeight',
    type: 'number',
    defaultDescription: '0',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window minimum height in pixels',
  }),
  def({
    cliFlag: 'min-width',
    scope: 'runtime',
    targetField: 'minWidth',
    type: 'number',
    defaultDescription: '0',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window minimum width in pixels',
  }),
  def({
    cliFlag: 'process-envs',
    scope: 'runtime',
    targetField: 'processEnvs',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    coerce: 'processEnvs',
    description:
      'a JSON string of key/value pairs to be set as environment variables before any browser windows are opened',
  }),
  def({
    cliFlag: 'single-instance',
    scope: 'runtime',
    targetField: 'singleInstance',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'allow only a single instance of the app',
  }),
  def({
    cliFlag: 'persist-session-cookies',
    scope: 'runtime',
    targetField: 'persistSessionCookies',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description:
      'keep session cookies across app restarts for in-scope domains (target URL, internal-urls, known login pages)',
  }),
  def({
    cliFlag: 'tray',
    scope: 'runtime',
    targetField: 'tray',
    type: 'string',
    default: 'false',
    choices: ['true', 'false', 'start-in-tray'] as const,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description:
      "allow app to stay in system tray. If 'start-in-tray' is set as argument, don't show main window on first start",
  }),
  def({
    cliFlag: 'width',
    scope: 'runtime',
    targetField: 'width',
    type: 'number',
    default: 1280,
    defaultDescription: '1280',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'app window default width in pixels',
  }),
  def({
    cliFlag: 'x',
    scope: 'runtime',
    targetField: 'x',
    type: 'number',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window x location in pixels from left',
  }),
  def({
    cliFlag: 'y',
    scope: 'runtime',
    targetField: 'y',
    type: 'number',
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set window y location in pixels from top',
  }),
  def({
    cliFlag: 'zoom',
    scope: 'runtime',
    targetField: 'zoom',
    type: 'number',
    default: 1.0,
    yargsGroup: YARGS_GROUP_TITLES.appWindow,
    description: 'set the default zoom factor for the app',
  }),

  // --- Internal browser ---
  def({
    cliFlag: 'file-download-options',
    scope: 'runtime',
    targetField: 'fileDownloadOptions',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.internalBrowser,
    coerce: 'json',
    description:
      'a JSON string defining file download options; see https://github.com/sindresorhus/electron-dl',
  }),
  def({
    cliFlag: 'inject',
    scope: 'runtime',
    targetField: 'inject',
    type: 'array',
    yargsGroup: YARGS_GROUP_TITLES.internalBrowser,
    description:
      'path to a CSS/JS file to be injected; pass multiple times to inject multiple files',
  }),
  def({
    cliFlag: 'lang',
    scope: 'runtime',
    targetField: 'lang',
    type: 'string',
    defaultDescription: 'os language at runtime of the app',
    yargsGroup: YARGS_GROUP_TITLES.internalBrowser,
    description:
      'set the language or locale to render the web site as (e.g., "fr", "en-US", "es", etc.)',
  }),
  def({
    cliFlag: 'u',
    alias: 'user-agent',
    scope: 'runtime',
    targetField: 'userAgent',
    rawKey: 'userAgent',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.internalBrowser,
    description:
      "set the app's user agent string; may also use 'edge', 'firefox', or 'safari' to have one auto-generated",
  }),
  def({
    cliFlag: 'user-agent-honest',
    alias: 'honest',
    scope: 'runtime',
    targetField: 'userAgentHonest',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.internalBrowser,
    description:
      'prevent the normal changing of the user agent string to appear as a regular Chrome browser',
  }),

  // --- Cache ---
  def({
    cliFlag: 'clear-cache',
    scope: 'runtime',
    targetField: 'clearCache',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.internalBrowserCache,
    description: 'prevent the app from preserving cache between launches',
  }),
  def({
    cliFlag: 'disk-cache-size',
    scope: 'runtime',
    targetField: 'diskCacheSize',
    type: 'number',
    defaultDescription: 'chromium default',
    yargsGroup: YARGS_GROUP_TITLES.internalBrowserCache,
    description:
      'set the maximum disk space (in bytes) to be used by the disk cache',
  }),

  // --- URL handling ---
  def({
    cliFlag: 'block-external-urls',
    scope: 'runtime',
    targetField: 'blockExternalUrls',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.urlHandling,
    description: `forbid navigation to URLs not considered "internal" (see '--internal-urls').  Instead of opening in an external browser, attempts to navigate to external URLs will be blocked`,
  }),
  def({
    cliFlag: 'internal-urls',
    scope: 'runtime',
    targetField: 'internalUrls',
    type: 'string',
    defaultDescription: 'URLs sharing the same base domain',
    yargsGroup: YARGS_GROUP_TITLES.urlHandling,
    description: `regex of URLs to consider "internal"; by default matches based on domain (see '--strict-internal-urls'); all other URLs will be opened in an external browser`,
  }),
  def({
    cliFlag: 'strict-internal-urls',
    scope: 'runtime',
    targetField: 'strictInternalUrls',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.urlHandling,
    description: 'disable domain-based matching on internal URLs',
  }),
  def({
    cliFlag: 'proxy-rules',
    scope: 'runtime',
    targetField: 'proxyRules',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.urlHandling,
    description:
      'proxy rules; see https://www.electronjs.org/docs/api/session#sessetproxyconfig',
  }),

  // --- Auth ---
  def({
    cliFlag: 'basic-auth-password',
    scope: 'runtime',
    targetField: 'basicAuthPassword',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.auth,
    description: 'basic http(s) auth password',
  }),
  def({
    cliFlag: 'basic-auth-username',
    scope: 'runtime',
    targetField: 'basicAuthUsername',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.auth,
    description: 'basic http(s) auth username',
  }),

  // --- Graphics ---
  def({
    cliFlag: 'disable-gpu',
    scope: 'runtime',
    targetField: 'disableGpu',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.graphics,
    description: 'disable hardware acceleration',
  }),
  def({
    cliFlag: 'enable-es3-apis',
    scope: 'runtime',
    targetField: 'enableEs3Apis',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.graphics,
    description: 'force activation of WebGL 2.0',
  }),
  def({
    cliFlag: 'ignore-gpu-blacklist',
    scope: 'runtime',
    targetField: 'ignoreGpuBlacklist',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.graphics,
    description: 'force WebGL apps to work on unsupported GPUs',
  }),

  // --- Security ---
  def({
    cliFlag: 'disable-old-build-warning-yesiknowitisinsecure',
    scope: 'runtime',
    rawKey: 'disableOldBuildWarningYesiknowitisinsecure',
    mapTo: { namespace: 'nativefier', field: 'disableOldBuildWarning' },
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.security,
    description:
      'disable warning shown when opening an app made too long ago; Nativefier uses the Chrome browser (through Electron), and it is dangerous to keep using an old version of it',
  }),
  def({
    cliFlag: 'ignore-certificate',
    scope: 'runtime',
    targetField: 'ignoreCertificate',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.security,
    description: 'ignore certificate-related errors',
  }),
  def({
    cliFlag: 'insecure',
    scope: 'runtime',
    targetField: 'insecure',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.security,
    description: 'enable loading of insecure content',
  }),

  // --- Deprecated flash ---
  def({
    cliFlag: 'flash',
    scope: 'deprecated',
    rawKey: 'flash',
    type: 'boolean',
    default: false,
    deprecated: true,
    hidden: true,
    yargsGroup: YARGS_GROUP_TITLES.flash,
    description: 'enable Adobe Flash',
  }),
  def({
    cliFlag: 'flash-path',
    scope: 'deprecated',
    rawKey: 'flashPath',
    mapTo: { namespace: 'nativefier', field: 'flashPluginDir' },
    type: 'string',
    deprecated: true,
    hidden: true,
    normalize: true,
    yargsGroup: YARGS_GROUP_TITLES.flash,
    description: 'path to Chrome flash plugin; find it in `chrome://plugins`',
  }),

  // --- Platform (packager + runtime) ---
  def({
    cliFlag: 'app-copyright',
    scope: 'packager',
    targetField: 'appCopyright',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description:
      '(macOS, windows only) set a human-readable copyright line for the app; maps to `LegalCopyright` metadata property on Windows, and `NSHumanReadableCopyright` on macOS',
  }),
  def({
    cliFlag: 'app-version',
    scope: 'packager',
    targetField: 'appVersion',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description:
      '(macOS, windows only) set the version of the app; maps to the `ProductVersion` metadata property on Windows, and `CFBundleShortVersionString` on macOS',
  }),
  def({
    cliFlag: 'bounce',
    scope: 'runtime',
    targetField: 'bounce',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description:
      '(macOS only) make the dock icon bounce when the counter increases',
  }),
  def({
    cliFlag: 'build-version',
    scope: 'packager',
    targetField: 'buildVersion',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description:
      '(macOS, windows only) set the build version of the app; maps to `FileVersion` metadata property on Windows, and `CFBundleVersion` on macOS',
  }),
  def({
    cliFlag: 'counter',
    scope: 'runtime',
    targetField: 'counter',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description:
      '(macOS only) set a dock count badge, determined by looking for a number in the window title',
  }),
  def({
    cliFlag: 'darwin-dark-mode-support',
    scope: 'packager',
    targetField: 'darwinDarkModeSupport',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description: '(macOS only) enable Dark Mode support on macOS 10.14+',
  }),
  def({
    cliFlag: 'f',
    alias: 'fast-quit',
    scope: 'runtime',
    targetField: 'fastQuit',
    rawKey: 'fastQuit',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description: '(macOS only) quit app on window close',
  }),
  def({
    cliFlag: 'title-bar-style',
    scope: 'runtime',
    targetField: 'titleBarStyle',
    type: 'string',
    choices: ['hidden', 'hiddenInset'] as const,
    yargsGroup: YARGS_GROUP_TITLES.platform,
    description:
      '(macOS only) set title bar style; consider injecting custom CSS (via --inject) for better integration',
  }),
  def({
    cliFlag: 'win32metadata',
    scope: 'packager',
    targetField: 'win32metadata',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.platform,
    coerce: 'win32metadata',
    description:
      '(windows only) a JSON string of key/value pairs (ProductName, InternalName, FileDescription) to embed as executable metadata',
  }),

  // --- Debug (runtime + packager quiet) ---
  def({
    cliFlag: 'crash-reporter',
    scope: 'runtime',
    targetField: 'crashReporter',
    type: 'string',
    yargsGroup: YARGS_GROUP_TITLES.debug,
    description: 'remote server URL to send crash reports',
  }),
  def({
    cliFlag: 'verbose',
    scope: 'runtime',
    targetField: 'verbose',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.debug,
    description: 'enable verbose/debug/troubleshooting logs',
  }),
  def({
    cliFlag: 'quiet',
    scope: 'runtime',
    targetField: 'quiet',
    type: 'boolean',
    default: false,
    yargsGroup: YARGS_GROUP_TITLES.debug,
    description: 'suppress all logging',
  }),

  // --- Runtime-only (no CLI flag) ---
  def({
    cliFlag: 'accessibility-prompt',
    scope: 'runtime',
    targetField: 'accessibilityPrompt',
    type: 'boolean',
    default: true,
    exposeOnCli: false,
    description: 'macOS accessibility permission prompt on first run',
  }),
];

/** yargs positionals registered in `initArgs` (not in {@link OPTION_DEFINITIONS}). */
export const CLI_POSITIONAL_NAMES = ['targetUrl', 'outputDirectory'] as const;

const SEMVER_VERSION_NUMBER_REGEX = /\d+\.\d+\.\d+[-_\w\d.]*/;

export function getDefinitionsByScope(scope: OptionScope): OptionDefinition[] {
  return OPTION_DEFINITIONS.filter((d) => d.scope === scope);
}

export function getCliOptionDefinitions(): OptionDefinition[] {
  return OPTION_DEFINITIONS.filter((d) => d.exposeOnCli !== false);
}

export function getSchemaCliFlagNames(): string[] {
  return getCliOptionDefinitions()
    .map((d) => d.cliFlag)
    .sort();
}

function getMappingTarget(
  definition: OptionDefinition,
): OptionMapTarget | undefined {
  if (definition.mapTo) {
    return definition.mapTo;
  }
  if (
    (definition.scope === 'packager' || definition.scope === 'runtime') &&
    definition.targetField
  ) {
    const namespace =
      definition.scope === 'packager' ? 'packager' : 'nativefier';
    return { namespace, field: definition.targetField };
  }
  return undefined;
}

function resolveRawKey(definition: OptionDefinition): string {
  if (definition.rawKey) {
    return definition.rawKey;
  }
  if (definition.alias && typeof definition.alias === 'string') {
    return definition.alias.replace(/-([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
  }
  return definition.cliFlag.replace(/-([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );
}

function readRawValue(
  rawOptions: RawOptions,
  definition: OptionDefinition,
): unknown {
  const key = resolveRawKey(definition);
  return (rawOptions as Record<string, unknown>)[key];
}

function resolveWithDefault<T>(
  rawValue: unknown,
  defaultValue: T | undefined,
): T | undefined {
  if (rawValue !== undefined) {
    return rawValue as T;
  }
  return defaultValue;
}

function assignMappedFields(
  packager: Record<string, unknown>,
  nativefier: Record<string, unknown>,
  rawOptions: RawOptions,
): void {
  for (const definition of OPTION_DEFINITIONS) {
    const target = getMappingTarget(definition);
    if (!target) {
      continue;
    }
    const rawValue = readRawValue(rawOptions, definition);
    const value = resolveWithDefault(rawValue, definition.default);
    if (value !== undefined) {
      const bucket = target.namespace === 'packager' ? packager : nativefier;
      bucket[target.field] = value;
    }
  }
}

/**
 * Build initial {@link AppOptions} from parsed CLI argv using schema defaults and mappings.
 */
export function buildAppOptionsFromSchema(
  rawOptions: RawOptions,
  packageVersion: string,
): AppOptions {
  const packagerPartial: Record<string, unknown> = {};
  const nativefierPartial: Record<string, unknown> = {};

  assignMappedFields(packagerPartial, nativefierPartial, rawOptions);

  const packager = {
    ...packagerPartial,
    arch: (rawOptions.arch ?? inferArch()) as SupportedArch,
    asar: rawOptions.asar ?? rawOptions.conceal ?? false,
    dir: PLACEHOLDER_APP_DIR,
    electronVersion:
      (packagerPartial.electronVersion as string | undefined) ??
      rawOptions.electronVersion ??
      DEFAULT_ELECTRON_VERSION,
    name:
      typeof rawOptions.name === 'string'
        ? rawOptions.name
        : ((packagerPartial.name as string | undefined) ?? ''),
    out: rawOptions.out ?? process.cwd(),
    overwrite: rawOptions.overwrite,
    quiet: rawOptions.quiet ?? false,
    platform: rawOptions.platform,
    targetUrl:
      rawOptions.targetUrl === undefined
        ? ''
        : normalizeUrl(rawOptions.targetUrl),
    tmpdir: false,
    upgrade: rawOptions.upgrade !== undefined,
    upgradeFrom:
      (rawOptions.upgradeFrom as string | undefined) ??
      (typeof rawOptions.upgrade === 'string' ? rawOptions.upgrade : undefined),
    win32metadata:
      rawOptions.win32metadata ??
      ({
        ProductName: rawOptions.name,
        InternalName: rawOptions.name,
        FileDescription: rawOptions.name,
      } as AppOptions['packager']['win32metadata']),
  } as AppOptions['packager'];

  const nativefier = {
    ...nativefierPartial,
    accessibilityPrompt:
      (nativefierPartial.accessibilityPrompt as boolean | undefined) ?? true,
    globalShortcuts: undefined,
    inject: rawOptions.inject ?? [],
    nativefierVersion: packageVersion,
    quiet: rawOptions.quiet ?? false,
    tray: rawOptions.tray ?? 'false',
    versionString: rawOptions.versionString,
  } as AppOptions['nativefier'];

  return { packager, nativefier };
}

function decorateYargOptionGroup(value: string): string {
  return `====== ${value} ======`;
}

function definitionToYargsConfig(definition: OptionDefinition): YargsOptions {
  const config: YargsOptions = {
    description: definition.description,
    type: definition.type,
  };
  if (definition.alias !== undefined) {
    config.alias = definition.alias;
  }
  if (definition.default !== undefined) {
    config.default = definition.default;
  }
  if (definition.defaultDescription !== undefined) {
    config.defaultDescription = definition.defaultDescription;
  }
  if (definition.choices !== undefined) {
    config.choices = [...definition.choices];
  }
  if (definition.normalize) {
    config.normalize = true;
  }
  if (definition.hidden) {
    config.hidden = true;
  }
  if (definition.deprecated) {
    config.deprecated = true;
  }
  if (definition.coerce === 'json') {
    config.coerce = parseJson;
  } else if (definition.coerce === 'processEnvs') {
    config.coerce = getProcessEnvs;
  } else if (definition.coerce === 'win32metadata') {
    config.coerce = (value: string): Win32MetadataOptions | undefined =>
      parseJson<Win32MetadataOptions>(value);
  }
  if (definition.type === 'array') {
    config.string = true;
  }
  return config;
}

/**
 * Register all schema-driven CLI flags and help groups on a yargs instance.
 */
export function applyOptionSchemaToYargs<T>(argv: Argv<T>): Argv<T> {
  let result = argv;
  for (const definition of getCliOptionDefinitions()) {
    result = result.option(
      definition.cliFlag,
      definitionToYargsConfig(definition),
    ) as Argv<T>;
  }

  const groupOrder = [
    YARGS_GROUP_TITLES.appCreation,
    YARGS_GROUP_TITLES.appWindow,
    YARGS_GROUP_TITLES.internalBrowser,
    YARGS_GROUP_TITLES.internalBrowserCache,
    YARGS_GROUP_TITLES.urlHandling,
    YARGS_GROUP_TITLES.auth,
    YARGS_GROUP_TITLES.graphics,
    YARGS_GROUP_TITLES.security,
    YARGS_GROUP_TITLES.flash,
    YARGS_GROUP_TITLES.platform,
    YARGS_GROUP_TITLES.debug,
  ];

  for (const title of groupOrder) {
    const flags = getCliOptionDefinitions()
      .filter((d) => d.yargsGroup === title)
      .map((d) => d.cliFlag);
    if (flags.length > 0) {
      result = result.group(flags, decorateYargOptionGroup(title)) as Argv<T>;
    }
  }

  return result;
}

/**
 * Validation after RawOptions → AppOptions mapping (throws on invalid input).
 */
export function assertValidMappedOptions(options: AppOptions): void {
  if (!options.packager.targetUrl) {
    throw new Error(
      options.packager.upgrade
        ? 'Could not determine targetUrl from the app being upgraded.'
        : 'targetUrl is required when building a new app.',
    );
  }

  if (options.nativefier.zoom !== undefined && options.nativefier.zoom <= 0) {
    throw new Error(
      `Invalid zoom factor "${options.nativefier.zoom}". Must be positive.`,
    );
  }

  if (options.packager.electronVersion) {
    const requestedVersion = options.packager.electronVersion;
    if (!SEMVER_VERSION_NUMBER_REGEX.exec(requestedVersion)) {
      throw `Invalid Electron version number "${requestedVersion}". Aborting.`;
    }
  }
}

/**
 * Non-fatal warnings for mapped options (e.g. old Electron requested).
 */
export function warnOnMappedOptions(options: AppOptions): void {
  if (!options.packager.electronVersion) {
    return;
  }
  const requestedVersion = options.packager.electronVersion;
  const requestedMajorVersion = parseInt(requestedVersion.split('.')[0], 10);
  if (requestedMajorVersion < ELECTRON_MAJOR_VERSION) {
    log.warn(
      `\nATTENTION: Using **old** Electron version ${requestedVersion} as requested.`,
      "\nIt's untested, bugs and horror will happen, you're on your own.",
      `\nSimply abort & re-run without passing the version flag to default to ${DEFAULT_ELECTRON_VERSION}`,
    );
  }
}

/** @returns true when the requested Electron major version is before 16 (widevine suffix). */
export function isElectronMajorBefore16(options: AppOptions): boolean {
  if (!options.packager.electronVersion) {
    return false;
  }
  const requestedMajorVersion = parseInt(
    options.packager.electronVersion.split('.')[0],
    10,
  );
  return requestedMajorVersion < 16;
}
