# Testing Strategy

Nativefier uses a layered test pyramid so most regressions are caught before Electron packaging or Playwright runs.

## Layers

| Layer | Location | Purpose |
| --- | --- | --- |
| **Unit** | `src/**/*.test.ts`, `app/src/**/*.test.ts`, `shared/src/**/*.test.ts` | Fast tests for pure helpers, option schema, build pipeline steps, preload modules, adapters. |
| **Contract** | `shared/src/contract/`, `src/options/nativefierJsonContract.test.ts` | One ruleset for `nativefier.json`: builder output (`mapAppOptionsToOutputOptions`) must satisfy `validateNativefierJsonContract` and runtime parsing (`parseRuntimeConfigJson`). |
| **Integration** | `*integration-test*` | Heavier scenarios; run with `npm run test:integration`. |
| **Playwright** | `*playwright-test*` | Smoke/regression in a real Electron app; run with `npm run test:playwright`. |

Jest executes **compiled** JavaScript under `lib/`, `app/dist/`, and `shared/lib/`. Run `npm run build` (or `npm run build:watch`) before `npm test`.

## Option and config contracts

- **CLI schema:** `src/options/optionSchema.test.ts` covers defaults, deprecated aliases, yargs registration, and `RawOptions` → `AppOptions` mapping.
- **Output mapping:** `src/options/outputOptionsMapper.test.ts` covers `OUTPUT_FIELD_MAPPINGS` renames and builder-only fields.
- **nativefier.json:** `shared/src/contract/nativefierJsonContract.ts` defines required runtime fields; `nativefierJsonContract.test.ts` (shared + src) ties builder output to that contract and to `parseRuntimeConfigJson`.

When adding an option: extend `optionSchema.ts`, `OUTPUT_FIELD_MAPPINGS`, shared types, and contract tests if the field is required at runtime.

## Build pipeline and packager

- Pipeline steps under `src/build/pipeline/*.test.ts` test resolve/prepare/package/finalize in isolation.
- `@electron/packager` is never called in unit tests: `electronPackagerAdapter` accepts an injected `packagerFn`; `packageElectronApp.test.ts` mocks that function.

## What not to rely on for every change

Integration and Playwright tests are the final safety net for end-to-end behavior, not the first place to catch a wrong default or a missing `nativefier.json` field. Prefer contract and unit tests for those.

## Commands

```bash
npm run build          # required before jest
npm run test:unit      # all jest tests (includes integration unless ignored)
npm run test:noplaywright
npm run test:integration
npm run test:playwright
npm run test:watch:unit
```

See [HACKING.md](../HACKING.md) for the live-reload workflow.
