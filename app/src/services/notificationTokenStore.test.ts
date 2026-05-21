import {
  clearToken,
  getToken,
  resetNotificationTokensForTests,
  rotateToken,
  validateToken,
} from './notificationTokenStore';

describe('notificationTokenStore', () => {
  beforeEach(() => {
    resetNotificationTokensForTests();
  });

  test('rotateToken stores and returns a new token per webContentsId', () => {
    const first = rotateToken(1);
    const second = rotateToken(1);

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect(getToken(1)).toBe(second);
  });

  test('validateToken matches only the current token', () => {
    const token = rotateToken(5);

    expect(validateToken(5, token)).toBe(true);
    expect(validateToken(5, 'stale')).toBe(false);
    expect(validateToken(99, token)).toBe(false);
  });

  test('clearToken removes token for webContentsId', () => {
    const token = rotateToken(3);
    expect(validateToken(3, token)).toBe(true);

    clearToken(3);

    expect(getToken(3)).toBeUndefined();
    expect(validateToken(3, token)).toBe(false);
  });

  test('tokens are isolated per webContentsId', () => {
    const tokenA = rotateToken(10);
    const tokenB = rotateToken(20);

    expect(validateToken(10, tokenA)).toBe(true);
    expect(validateToken(20, tokenB)).toBe(true);
    expect(validateToken(10, tokenB)).toBe(false);
    expect(validateToken(20, tokenA)).toBe(false);
  });
});
