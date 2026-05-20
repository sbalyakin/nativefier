import { validateNativefierJsonContract } from '../../../shared/lib/src/contract/nativefierJsonContract';
import { STABLE_CONTRACT_TEST_BUILD_DATE } from '../../../shared/lib/src/contract/testFixtures';
import { parseRuntimeConfigJson } from './loadRuntimeConfig';

const minimalValidJson = JSON.stringify({
  name: 'APP',
  targetUrl: 'https://example.com/',
  nativefierVersion: '53.0.0',
  buildDate: STABLE_CONTRACT_TEST_BUILD_DATE,
  blockExternalUrls: false,
  disableDevTools: false,
  isUpgrade: false,
  strictInternalUrls: false,
  oldBuildWarningText: '',
});

test('runtime parser accepts JSON that passes shared contract', () => {
  const config = parseRuntimeConfigJson(minimalValidJson);
  expect(config.targetUrl).toBe('https://example.com/');
  expect(validateNativefierJsonContract(config)).toEqual([]);
});
