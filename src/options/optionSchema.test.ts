import { getRegisteredYargsOptionKeys, initArgs } from '../cli';
import {
  CLI_POSITIONAL_NAMES,
  OPTION_DEFINITIONS,
  assertValidMappedOptions,
  buildAppOptionsFromSchema,
  getCliOptionDefinitions,
  getDefinitionsByScope,
  getSchemaCliFlagNames,
} from './optionSchema';
import type { RawOptions } from '../buildTimeContract';

test('every CLI flag has a scope and yargs group', () => {
  for (const def of getCliOptionDefinitions()) {
    expect(def.scope).toBeDefined();
    expect(def.yargsGroup).toBeDefined();
  }
});

test('deprecated flags are marked deprecated', () => {
  const deprecated = getDefinitionsByScope('deprecated');
  expect(deprecated.map((d) => d.cliFlag).sort()).toEqual(
    ['flash', 'flash-path'].sort(),
  );
  for (const def of deprecated) {
    expect(def.deprecated).toBe(true);
  }
});

test('conceal is a supported CLI alias for asar, not deprecated', () => {
  const conceal = OPTION_DEFINITIONS.find((d) => d.cliFlag === 'c');
  expect(conceal?.scope).toBe('cliOnly');
  expect(conceal?.deprecated).toBeFalsy();
});

test('buildAppOptionsFromSchema applies runtime defaults', () => {
  const raw: RawOptions = {
    targetUrl: 'https://example.com/',
    tray: 'false',
  };
  const options = buildAppOptionsFromSchema(raw, '99.0.0');
  expect(options.webholm.accessibilityPrompt).toBe(true);
  expect(options.webholm.width).toBe(1280);
  expect(options.webholm.height).toBe(800);
  expect(options.webholm.zoom).toBe(1);
  expect(options.webholm.tray).toBe('false');
  expect(options.webholm.webholmVersion).toBe('99.0.0');
  expect(options.packager.asar).toBe(false);
});

test('conceal maps to packager asar', () => {
  const options = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test', conceal: true },
    '1.0.0',
  );
  expect(options.packager.asar).toBe(true);
});

test('disable-old-build-warning CLI key maps to disableOldBuildWarning', () => {
  const options = buildAppOptionsFromSchema(
    {
      targetUrl: 'https://a.test',
      disableOldBuildWarningYesiknowitisinsecure: true,
    },
    '1.0.0',
  );
  expect(options.webholm.disableOldBuildWarning).toBe(true);
});

test('flash-path maps to flashPluginDir', () => {
  const options = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test', flashPath: '/tmp/flash' },
    '1.0.0',
  );
  expect(options.webholm.flashPluginDir).toBe('/tmp/flash');
});

test('registered yargs flags match schema CLI flags and positionals', () => {
  const argv = initArgs(['https://example.com/']);
  const registered = getRegisteredYargsOptionKeys(argv)
    .filter((key) => key !== 'help' && key !== 'version')
    .sort();
  const expected = [...getSchemaCliFlagNames(), ...CLI_POSITIONAL_NAMES].sort();
  expect(registered).toEqual(expected);
});

test('assertValidMappedOptions rejects invalid electron version', () => {
  const options = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test', electronVersion: 'not-a-version' },
    '1.0.0',
  );
  expect(() => assertValidMappedOptions(options)).toThrow(
    /Invalid Electron version/,
  );
});

test('assertValidMappedOptions requires targetUrl for new builds', () => {
  const options = buildAppOptionsFromSchema({}, '1.0.0');
  expect(() => assertValidMappedOptions(options)).toThrow(
    /targetUrl is required when building a new app/,
  );
});

test('assertValidMappedOptions requires targetUrl when upgrading', () => {
  const options = buildAppOptionsFromSchema({ upgrade: true }, '1.0.0');
  expect(() => assertValidMappedOptions(options)).toThrow(
    /Could not determine targetUrl from the app being upgraded/,
  );
});

test('definitions with mapTo document rawKey → AppOptions field', () => {
  const mapped = OPTION_DEFINITIONS.filter((d) => d.mapTo);
  const flags = mapped.map((d) => d.cliFlag).sort();
  expect(flags).toEqual(
    ['disable-old-build-warning-yesiknowitisinsecure', 'flash-path'].sort(),
  );
});

test('packager scope maps argv into packager bucket', () => {
  const options = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test', arch: 'arm64', portable: true },
    '1.0.0',
  );
  expect(options.packager.arch).toBe('arm64');
  expect(options.packager.portable).toBe(true);
});

test('runtime scope maps argv into nativefier bucket', () => {
  const options = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test', width: 640, blockExternalUrls: true },
    '1.0.0',
  );
  expect(options.webholm.width).toBe(640);
  expect(options.webholm.blockExternalUrls).toBe(true);
});

test('cliOnly conceal does not set packager asar until mapped in buildAppOptionsFromSchema', () => {
  const without = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test' },
    '1.0.0',
  );
  const withConceal = buildAppOptionsFromSchema(
    { targetUrl: 'https://a.test', conceal: true },
    '1.0.0',
  );
  expect(without.packager.asar).toBe(false);
  expect(withConceal.packager.asar).toBe(true);
});

test('schema covers all mapped packager and runtime CLI fields', () => {
  const mappedCliFlags = new Set(
    OPTION_DEFINITIONS.filter(
      (d) =>
        d.exposeOnCli !== false &&
        (d.scope === 'packager' || d.scope === 'runtime') &&
        d.targetField,
    ).map((d) => d.cliFlag),
  );
  expect(mappedCliFlags.has('width')).toBe(true);
  expect(mappedCliFlags.has('widevine')).toBe(true);
  expect(mappedCliFlags.has('darwin-dark-mode-support')).toBe(true);
});
