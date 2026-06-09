#!/usr/bin/env node
/**
 * Audit Electron versions across Nativefier and optionally bump them in sync.
 *
 * Usage:
 *   node .github/audit-electron.mjs              # report only
 *   node .github/audit-electron.mjs --apply 42.3.3   # write synced versions
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const RELEASES_URL = 'https://releases.electronjs.org/releases.json';
const NPM_ELECTRON_URL = 'https://registry.npmjs.org/electron/latest';

const FILES = {
  constants: path.join(ROOT, 'src/constants.ts'),
  rootPkg: path.join(ROOT, 'package.json'),
  appPkg: path.join(ROOT, 'app/package.json'),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseConstants(content) {
  const electronMatch = content.match(
    /export const DEFAULT_ELECTRON_VERSION = '([^']+)';/,
  );
  const chromeMatch = content.match(
    /export const DEFAULT_CHROME_VERSION = '([^']+)';/,
  );
  if (!electronMatch || !chromeMatch) {
    throw new Error(`Could not parse versions from ${FILES.constants}`);
  }
  return {
    electron: electronMatch[1],
    chrome: chromeMatch[1],
  };
}

function parseApplyArg(argv) {
  const applyIndex = argv.indexOf('--apply');
  if (applyIndex === -1) {
    return null;
  }
  const version = argv[applyIndex + 1];
  if (!version || version.startsWith('-')) {
    throw new Error('Usage: audit-electron.mjs --apply <version>');
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid Electron version "${version}". Expected X.Y.Z`);
  }
  return version;
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function getChromeForElectron(version) {
  const releases = await fetchJson(RELEASES_URL);
  const release = releases.find((entry) => entry.version === version);
  if (!release?.chrome) {
    throw new Error(
      `Chrome version not found for Electron ${version} in ${RELEASES_URL}`,
    );
  }
  return release.chrome;
}

async function getLatestNpmElectron() {
  const latest = await fetchJson(NPM_ELECTRON_URL);
  return latest.version;
}

async function isElectronOnNpm(version) {
  const response = await fetch(
    `https://registry.npmjs.org/electron/${version}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  return response.ok;
}

function electronRangeFor(version) {
  const [major, minor] = version.split('.');
  return `^${major}.${minor}.0`;
}

function updateConstants(content, electronVersion, chromeVersion) {
  return content
    .replace(
      /export const DEFAULT_ELECTRON_VERSION = '[^']+';/,
      `export const DEFAULT_ELECTRON_VERSION = '${electronVersion}';`,
    )
    .replace(
      /export const DEFAULT_CHROME_VERSION = '[^']+';/,
      `export const DEFAULT_CHROME_VERSION = '${chromeVersion}';`,
    );
}

function updatePackageElectron(pkg, version) {
  const next = structuredClone(pkg);
  next.devDependencies ??= {};
  next.devDependencies.electron = electronRangeFor(version);
  return next;
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function compareSemver(a, b) {
  const partsA = a.split('.').map((part) => parseInt(part, 10));
  const partsB = b.split('.').map((part) => parseInt(part, 10));
  for (let i = 0; i < 3; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

async function main() {
  const applyVersion = parseApplyArg(process.argv.slice(2));

  const constantsContent = fs.readFileSync(FILES.constants, 'utf8');
  const constants = parseConstants(constantsContent);
  const rootPkg = readJson(FILES.rootPkg);
  const appPkg = readJson(FILES.appPkg);
  const rootRange = rootPkg.devDependencies?.electron ?? '(missing)';
  const appRange = appPkg.devDependencies?.electron ?? '(missing)';

  const latestNpm = await getLatestNpmElectron();
  const targetVersion = applyVersion ?? constants.electron;
  const targetChrome = await getChromeForElectron(targetVersion);
  const targetOnNpm = await isElectronOnNpm(targetVersion);

  printSection('Electron audit');
  console.log(`Default (constants.ts):     ${constants.electron}`);
  console.log(`Default Chrome:             ${constants.chrome}`);
  console.log(`Root package.json range:    ${rootRange}`);
  console.log(`App package.json range:     ${appRange}`);
  console.log(`npm latest:                 ${latestNpm}`);
  console.log(`Target on npm registry:     ${targetOnNpm ? 'yes' : 'no'}`);

  const mismatches = [];
  if (rootRange !== appRange) {
    mismatches.push(`Root and app electron ranges differ (${rootRange} vs ${appRange})`);
  }
  const expectedRange = electronRangeFor(constants.electron);
  if (rootRange !== expectedRange && rootRange !== '(missing)') {
    mismatches.push(
      `Root range ${rootRange} does not match default ${expectedRange}`,
    );
  }
  if (compareSemver(constants.electron, latestNpm) < 0) {
    mismatches.push(
      `DEFAULT_ELECTRON_VERSION ${constants.electron} is behind npm latest ${latestNpm}`,
    );
  }

  if (mismatches.length > 0) {
    printSection('Warnings');
    for (const warning of mismatches) {
      console.log(`- ${warning}`);
    }
  } else {
    printSection('Warnings');
    console.log('- none');
  }

  const targetMajor = parseInt(targetVersion.split('.')[0], 10);
  const currentMajor = parseInt(constants.electron.split('.')[0], 10);
  const isMajorBump = targetMajor !== currentMajor;

  printSection('Recommended workflow');
  if (isMajorBump) {
    console.log('Major Electron bump detected. Before changing versions:');
    console.log('1. Read https://www.electronjs.org/docs/breaking-changes');
    console.log('2. Grep the codebase for every changed API');
    console.log('3. Avoid .0.0 releases until they stabilize (see HACKING.md)');
  } else {
    console.log('Minor/patch bump within the same major:');
    console.log('1. Sync versions with this script (--apply) or manually');
    console.log('2. npm run relock');
    console.log('3. npm run build && npm run lint && npm test');
    console.log('4. npm run test:manual on macOS if you can');
  }

  console.log('\nFiles to keep in sync:');
  console.log('- src/constants.ts (DEFAULT_ELECTRON_VERSION + DEFAULT_CHROME_VERSION)');
  console.log('- package.json devDependencies.electron');
  console.log('- app/package.json devDependencies.electron');

  if (!applyVersion) {
    console.log('\nTo apply a bump:');
    console.log(`  node .github/audit-electron.mjs --apply ${latestNpm}`);
    console.log('Then run: npm run relock && npm run build && npm test');
    return;
  }

  if (!targetOnNpm) {
    console.error(
      `\nERROR: electron@${applyVersion} is not on npm yet (latest: ${latestNpm}).`,
    );
    console.error(
      'Packaged apps can still use this version via DEFAULT_ELECTRON_VERSION,',
    );
    console.error(
      'but devDependencies/shrinkwrap need an npm-published version for npm install.',
    );
    console.error(
      `Set devDependencies to ^${applyVersion.split('.').slice(0, 2).join('.')}.0 after npm publish, or use --apply ${latestNpm}.`,
    );
    process.exit(1);
  }

  printSection(`Applying Electron ${applyVersion}`);
  console.log(`Chrome for ${applyVersion}: ${targetChrome}`);

  const nextConstants = updateConstants(
    constantsContent,
    applyVersion,
    targetChrome,
  );
  const nextRootPkg = updatePackageElectron(rootPkg, applyVersion);
  const nextAppPkg = updatePackageElectron(appPkg, applyVersion);

  fs.writeFileSync(FILES.constants, nextConstants);
  fs.writeFileSync(FILES.rootPkg, `${JSON.stringify(nextRootPkg, null, 2)}\n`);
  fs.writeFileSync(FILES.appPkg, `${JSON.stringify(nextAppPkg, null, 2)}\n`);

  console.log('Updated:');
  console.log(`- ${path.relative(ROOT, FILES.constants)}`);
  console.log(`- ${path.relative(ROOT, FILES.rootPkg)}`);
  console.log(`- ${path.relative(ROOT, FILES.appPkg)}`);
  console.log('\nNext: npm run relock && npm run build && npm test');
  if (isMajorBump) {
    console.log('Major bump: add [BREAKING] to CHANGELOG.md and release as major Nativefier version.');
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
