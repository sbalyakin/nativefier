import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  test('resolves when promise completes in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'late')).resolves.toBe(
      'ok',
    );
  });

  test('rejects when promise exceeds timeout', async () => {
    jest.useFakeTimers();
    const never = new Promise<string>(() => undefined);
    const result = withTimeout(never, 1000, 'too slow');
    const expectation = expect(result).rejects.toThrow('too slow');
    await jest.advanceTimersByTimeAsync(1000);
    await expectation;
    jest.useRealTimers();
  });
});
