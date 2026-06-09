# Technical Roadmap (Post-Stabilization)

This document records decisions and prerequisites for infrastructure work that should stay **after** the architecture phases in [app-modernization plan](../.cursor/plans/app-modernization_6ae96bd4.plan.md) (layers, option schema, build pipeline, adapters, contract tests). Those phases are in place; the items below are tracked here so they do not mix with behavioral refactors.

## ESM migration

### Current state

| Area | Format | Notes |
| --- | --- | --- |
| TypeScript compile (`tsconfig-base.json`) | CommonJS | `"module": "commonjs"` → `lib/`, `app/lib/`, `shared/lib/` |
| Published CLI (`package.json` `main`) | CJS | `lib/cli.js`; no `"type": "module"` |
| Jest | CJS tests + VM modules | All test scripts set `NODE_OPTIONS=--experimental-vm-modules` so dynamic `import('@electron/packager')` works |
| Runtime app template | Webpack bundle | Separate from CLI module graph |
| `@electron/get` | ESM-only | `electronPackagerAdapter.ts` stubs it under `JEST_WORKER_ID`; production uses `createRequire` |

### Prerequisites before flipping packages to ESM

1. Jest and `npm test` stay green without `createRequire` workarounds for Electron tooling (or Jest runs against ESM output natively).
2. `npm run build` and `prepare` / `npm ci` workflows unchanged for contributors.
3. Published `nativefier` bin remains installable on supported Node LTS without experimental flags for **end users** (test-only flags are acceptable).
4. Document dual-package or subpath export strategy if CLI stays CJS while dependencies are ESM-only.

### Recommended order (when started)

1. Add an ADR or PR checklist; do **not** enable `"type": "module"` at repo root in one step.
2. Migrate leaf modules with no `require()` consumers (e.g. pure helpers in `shared/`) first.
3. Switch `src/` compile target or use `"module": "NodeNext"` with explicit `.js` extensions in imports.
4. Align Jest `extensionsToTreatAsEsm` / `transform` only if needed after compile output changes.
5. Revisit `electronPackagerAdapter` once `@electron/get` loads in the test runtime without stubs.

**Status:** deferred. CJS + documented adapter boundaries are sufficient for current Electron 42.x line.

## Dependency updates

### Policy

- **Patch/minor** within existing semver ranges: one PR, run `npm run relock` (or `relock:cli` / `relock:app`), full `npm run build` and `npm test`.
- **Major** bumps (e.g. ESLint 10, TypeScript 6, Yargs 18, `webpack-cli` 7): separate PRs with release notes and focused CI.
- Audit: `npm run list-outdated-deps` (root + `app/`).

### Recently applied (safe, same major)

- `electron` ^42.2.0 (CLI devDependency + `app/` template)
- `typescript-eslint` patch aligned with ESLint 10.x
- `webpack` 5.107.x (app template build)
- `@types/node` 24.13.x (aligned with CI Node 24; not 25 until `engines.node` bump)

### Recently applied (major, phase 2)

| Package | Version | Notes |
| --- | --- | --- |
| `eslint` / `@eslint/js` | 10.x | Flat config unchanged; ESLint 10 `preserve-caught-error`, `no-useless-assignment` fixes |
| `yargs` | 18.x | `src/yargsFactory.ts` for ESM/CJS interop; `args.terminalWidth()` instance method |
| `typescript` | 6.x | `ignoreDeprecations: "6.0"`, explicit `types`, `app/tsconfig.webpack.json`, clean drops `*.tsbuildinfo` |
| `webpack-cli` | 7.x | No webpack config changes required |
| `cross-env` | 10.x | Test scripts unchanged; requires Node ≥20 (project `engines.node` ≥22) |

### Not scheduled here

| Package | Latest (approx.) | Reason to defer |
| --- | --- | --- |
| `@types/node` | 25.x | Requires bump minimum Node and CI matrix |

## Electron packager and alternatives

### Adapter

All production calls go through `src/build/electronPackagerAdapter.ts`:

- Injectable `packagerFn` for unit tests (`packageElectronApp.test.ts`).
- Dynamic `import('@electron/packager')` in production.
- `@electron/get` proxy init isolated here.

### Evaluation (2026)

| Tool | Fit for Nativefier | Notes |
| --- | --- | --- |
| **@electron/packager** | **Current choice** | Matches “wrap URL → folder app” model; already integrated; upgrade path is version bumps + adapter tweaks. |
| **electron-builder** | Poor default swap | Stronger opinion on installers, signing, auto-update; would duplicate much of `prepareElectronApp` / upgrade logic. |
| **@electron/forge** | Poor default swap | Full dev workflow (start, publish); heavier than CLI-only packaging. |
| **Custom fork** | Only if upstream blocks a fix | Prefer upstream PR + adapter shim first. |

**Decision:** keep `@electron/packager` until a concrete limitation appears (platform support, security, API removal). Any future swap should implement `ElectronPackagerFn` and pass existing pipeline + integration tests.

## Native utilities (Rust / Go)

No build-time bottleneck justifies a second language today (icon conversion, ASAR, and packaging are I/O- and Electron-bound).

**Trigger to reconsider:** measured hotspot in profiling (e.g. repeated large ASAR walks, icon pipeline on CI) where a small CLI binary would cut wall time significantly.

**Constraint:** utilities must remain optional dev/CI tools; the published `nativefier` npm package stays Node.js for installability on conservative distros (see `package.json` `engines`).

## Related docs

- [architecture.md](architecture.md) — layer boundaries
- [testing.md](testing.md) — contract and pipeline tests
- [HACKING.md](../HACKING.md) — `relock` and local setup
