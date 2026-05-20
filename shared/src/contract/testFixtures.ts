/** Stable timestamp for JSON contract unit tests (validator does not check age). */
export const STABLE_CONTRACT_TEST_BUILD_DATE = 1_700_000_000_000;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** buildDate within the 90-day old-build warning window for Electron launch tests. */
export function recentTestBuildDate(): number {
  return Date.now() - ONE_DAY_MS;
}
