import { validateWebholmJsonContract } from '../../shared/lib/src/contract/webholmJsonContract';
import type { AppOptions } from '../buildTimeContract';
import { buildAppOptionsFromSchema } from './optionSchema';
import {
  OUTPUT_FIELD_MAPPINGS,
  mapAppOptionsToOutputOptions,
} from './outputOptionsMapper';

const minimalAppOptions = (): AppOptions =>
  buildAppOptionsFromSchema(
    { targetUrl: 'https://example.com/' },
    '54.0.0',
  ) as AppOptions;

test('OUTPUT_FIELD_MAPPINGS has unique output keys', () => {
  const keys = OUTPUT_FIELD_MAPPINGS.map((m) => m.outputKey);
  expect(new Set(keys).size).toBe(keys.length);
});

test('builder output satisfies shared nativefier.json contract', () => {
  const output = mapAppOptionsToOutputOptions(minimalAppOptions());
  expect(validateWebholmJsonContract(output)).toEqual([]);
});

test('schema defaults produce runtime-valid nativefier.json', () => {
  const options = buildAppOptionsFromSchema(
    { targetUrl: 'https://contract.test/' },
    '1.0.0',
  );
  const output = mapAppOptionsToOutputOptions(options as AppOptions);
  expect(output.blockExternalUrls).toBe(false);
  expect(output.disableDevTools).toBe(false);
  expect(output.strictInternalUrls).toBe(false);
  expect(validateWebholmJsonContract(output)).toEqual([]);
});
