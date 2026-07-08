#!/usr/bin/env node
import 'source-map-support/register';

import * as log from 'loglevel';
import type * as yargs from 'yargs';
import yargsFactory from './yargsFactory';

import {
  camelCased,
  checkInternet,
  getProcessEnvs,
  isArgFormatInvalid,
} from './helpers/helpers';
import { buildWebholmApp } from './main';
import { RawOptions } from './buildTimeContract';
import { applyOptionSchemaToYargs } from './options/optionSchema';
import { parseJson } from './utils/parseUtils';

// @types/yargs@17.x started pretending yargs.argv can be a promise:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/8e17f9ca957a06040badb53ae7688fbb74229ccf/types/yargs/index.d.ts#L73
// Dunno in which case it happens, but it doesn't for us! So, having to await
// (and end up having to flag sync code as async) would be useless and annoying.
// So, copy-pastaing and axing the Promise half of yargs's type definition,
// to have a *non*-promise type. Maybe that's wrong. If it is, this type should
// be dropped, and extra async-ness should be added where needed.
type YargsArgvSync<T> = {
  [key in keyof yargs.Arguments<T> as
    | key
    | yargs.CamelCaseKey<key>]: yargs.Arguments<T>[key];
};

export function initArgs(argv: string[]): yargs.Argv<RawOptions> {
  const sanitizedArgs = sanitizeArgs(argv);
  let args = yargsFactory(sanitizedArgs)
    .scriptName('webholm')
    .usage(
      '$0 <targetUrl> [outputDirectory] [other options]\nor\n$0 --upgrade <pathToExistingApp> [other options]',
    )
    .example(
      '$0 <targetUrl> -n <name>',
      'Make an app from <targetUrl> and set the application name to <name>',
    )
    .example(
      '$0 --upgrade <pathToExistingApp>',
      'Upgrade (in place) the existing Webholm app at <pathToExistingApp>',
    )
    .example(
      '$0 <targetUrl> -p <platform> -a <arch>',
      'Make an app from <targetUrl> for the OS <platform> and CPU architecture <arch>',
    )
    .example(
      'for more examples and help...',
      'See https://github.com/nativefier/nativefier/blob/master/CATALOG.md',
    )
    .positional('targetUrl', {
      description:
        'the URL that you wish to to turn into a native app; required if not using --upgrade',
      type: 'string',
    })
    .positional('outputDirectory', {
      defaultDescription:
        'defaults to the current directory, or env. var. WEBHOLM_APPS_DIR (or legacy NATIVEFIER_APPS_DIR) if set',
      description: 'the directory to generate the app in',
      normalize: true,
      type: 'string',
    });

  args = applyOptionSchemaToYargs(args);

  args = args
    .version()
    .help()
    .group(['version', 'help'], 'Other Options')
    .wrap(args.terminalWidth());

  // We must access argv in order to get yargs to actually process args
  // Do this now to go ahead and get any errors out of the way
  void (args.argv as YargsArgvSync<RawOptions>);

  return args as yargs.Argv<RawOptions>;
}

type YargsArgvWithUsage = yargs.Argv<RawOptions> & {
  getInternalMethods: () => {
    getUsageInstance: () => { getDescriptions: () => Record<string, string> };
  };
};

/** Keys passed to yargs `.option()` / `.positional()` (for contract tests). */
export function getRegisteredYargsOptionKeys(
  argv: yargs.Argv<RawOptions>,
): string[] {
  const withUsage = argv as YargsArgvWithUsage;
  return Object.keys(
    withUsage.getInternalMethods().getUsageInstance().getDescriptions(),
  );
}

export function parseArgs(args: yargs.Argv<RawOptions>): RawOptions {
  const parsed = { ...(args.argv as YargsArgvSync<RawOptions>) };
  // In yargs, the _ property of the parsed args is an array of the positional args
  // https://github.com/yargs/yargs/blob/master/docs/examples.md#and-non-hyphenated-options-too-just-use-argv_
  // So try to extract the targetUrl and outputDirectory from these
  parsed.targetUrl = parsed._.length > 0 ? parsed._[0].toString() : undefined;
  parsed.out = parsed._.length > 1 ? (parsed._[1] as string) : undefined;

  if (parsed.upgrade && parsed.targetUrl) {
    let targetAndUpgrade = false;
    if (!parsed.out) {
      // If we're upgrading, the first positional args might be the outputDirectory, so swap these if we can
      try {
        // If this succeeds, we have a problem
        new URL(parsed.targetUrl);
        targetAndUpgrade = true;
      } catch {
        // Cool, it's not a URL
        parsed.out = parsed.targetUrl;
        parsed.targetUrl = undefined;
      }
    } else {
      // Someone supplied a targetUrl, an outputDirectory, and --upgrade. That's not cool.
      targetAndUpgrade = true;
    }

    if (targetAndUpgrade) {
      throw new Error(
        'ERROR: Webholm must be called with either a targetUrl or the --upgrade option, not both.\n',
      );
    }
  }

  if (!parsed.targetUrl && !parsed.upgrade) {
    throw new Error(
      'ERROR: Webholm must be called with either a targetUrl or the --upgrade option.\n',
    );
  }

  parsed.noOverwrite = parsed['no-overwrite'] = !parsed.overwrite;

  // Since coerce in yargs seems to have broken since
  // https://github.com/yargs/yargs/pull/1978
  for (const arg of [
    'win32metadata',
    'browserwindow-options',
    'file-download-options',
  ]) {
    if (parsed[arg] && typeof parsed[arg] === 'string') {
      parsed[arg] = parseJson(parsed[arg] as string);
      // sets fileDownloadOptions and browserWindowOptions
      // as parsed object as they were still strings in `webholm.json`
      // because only their snake-cased variants were being parsed above
      parsed[camelCased(arg)] = parsed[arg];
    }
  }
  if (parsed['process-envs'] && typeof parsed['process-envs'] === 'string') {
    parsed['process-envs'] = getProcessEnvs(parsed['process-envs']);
  }

  return parsed;
}

function sanitizeArgs(argv: string[]): string[] {
  const sanitizedArgs: string[] = [];
  argv.forEach((arg) => {
    if (isArgFormatInvalid(arg)) {
      throw new Error(
        `Invalid argument passed: ${arg} .\nWebholm supports short options (like "-n") and long options (like "--name"), all lowercase. Run "webholm --help" for help.\nAborting`,
      );
    }
    const isLastArg = sanitizedArgs.length + 1 === argv.length;
    if (sanitizedArgs.length > 0) {
      const previousArg = sanitizedArgs[sanitizedArgs.length - 1];

      log.debug({ arg, previousArg, isLastArg });

      // Work around commander.js not supporting default argument for options
      if (
        previousArg === '--tray' &&
        !['true', 'false', 'start-in-tray'].includes(arg)
      ) {
        sanitizedArgs.push('true');
      }
    }
    sanitizedArgs.push(arg);

    if (arg === '--tray' && isLastArg) {
      // Add a true if --tray is last so it gets enabled
      sanitizedArgs.push('true');
    }
  });

  return sanitizedArgs;
}

if (require.main === module) {
  let args: yargs.Argv<RawOptions> | undefined = undefined;
  let parsedArgs: RawOptions;
  try {
    args = initArgs(process.argv.slice(2));
    parsedArgs = parseArgs(args);
  } catch (err: unknown) {
    if (args) {
      log.error(err);
      args.showHelp();
    } else {
      log.error('Failed to parse command-line arguments. Aborting.', err);
    }
    process.exit(1);
  }

  const options: RawOptions = {
    ...parsedArgs,
  };

  if (options.verbose) {
    log.setLevel('trace');
    try {
      require('debug').enable('@electron/packager');
    } catch {
      log.debug(
        'Failed to enable @electron/packager debug output. This should not happen,',
        'and suggests their internals changed. Please report an issue.',
      );
    }

    log.debug(
      'Running in verbose mode! This will produce a mountain of logs and',
      'is recommended only for troubleshooting or if you like Shakespeare.',
    );
  } else if (options.quiet) {
    log.setLevel('silent');
  } else {
    log.setLevel('info');
  }

  checkInternet();

  if (!options.out) {
    if (process.env.WEBHOLM_APPS_DIR) {
      options.out = process.env.WEBHOLM_APPS_DIR;
    } else if (process.env.NATIVEFIER_APPS_DIR) {
      options.out = process.env.NATIVEFIER_APPS_DIR;
    }
  }

  buildWebholmApp(options)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log.error('Error during build. Run with --verbose for details.', error);
      process.exit(1);
    });
}
