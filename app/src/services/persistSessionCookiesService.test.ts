import type { Cookie, Session } from 'electron';

import {
  SESSION_COOKIE_TTL_SECONDS,
  isCookieInAppScope,
  registerPersistSessionCookies,
} from './persistSessionCookiesService';

const edclubOptions = {
  targetUrl: 'https://www.edclub.com/',
  internalUrls: '.*?(edclub|typingclub|clever)\\.com.*?',
  strictInternalUrls: false,
};

function makeSessionCookie(overrides: Partial<Cookie> = {}): Cookie {
  return {
    name: 'sessionid',
    value: 'abc123',
    domain: '.edclub.com',
    path: '/',
    secure: true,
    httpOnly: true,
    session: true,
    ...overrides,
  } as Cookie;
}

function captureCookieListener(session: Session) {
  const listeners: Array<
    (event: unknown, cookie: Cookie, cause: string, removed: boolean) => void
  > = [];
  const set = jest.fn().mockResolvedValue(undefined);
  const cookiesApi = {
    on: jest.fn((_event: string, listener: (typeof listeners)[0]) => {
      listeners.push(listener);
    }),
    set,
  };
  Object.defineProperty(session, 'cookies', { value: cookiesApi });
  return { listeners, set, cookiesApi };
}

test('isCookieInAppScope matches target and internal-url domains', () => {
  expect(isCookieInAppScope(makeSessionCookie(), edclubOptions)).toBe(true);
  expect(
    isCookieInAppScope(
      makeSessionCookie({ domain: '.typingclub.com' }),
      edclubOptions,
    ),
  ).toBe(true);
  expect(
    isCookieInAppScope(
      makeSessionCookie({ domain: '.accounts.google.com' }),
      edclubOptions,
    ),
  ).toBe(true);
});

test('isCookieInAppScope rejects out-of-scope tracker domains', () => {
  expect(
    isCookieInAppScope(
      makeSessionCookie({ domain: '.doubleclick.net' }),
      edclubOptions,
    ),
  ).toBe(false);
  expect(isCookieInAppScope(makeSessionCookie({ domain: undefined }), edclubOptions)).toBe(
    false,
  );
});

test('registerPersistSessionCookies promotes in-scope session cookies', async () => {
  const session = {} as Session;
  const { listeners, set } = captureCookieListener(session);

  registerPersistSessionCookies(session, edclubOptions);
  registerPersistSessionCookies(session, edclubOptions);

  expect(session.cookies.on).toHaveBeenCalledTimes(1);

  const before = Math.floor(Date.now() / 1000);
  listeners[0]({}, makeSessionCookie(), 'explicit', false);
  await Promise.resolve();
  const after = Math.floor(Date.now() / 1000);

  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({
      url: 'https://edclub.com/',
      name: 'sessionid',
      value: 'abc123',
      expirationDate: expect.any(Number),
    }),
  );
  const expirationDate = set.mock.calls[0][0].expirationDate as number;
  expect(expirationDate).toBeGreaterThanOrEqual(
    before + SESSION_COOKIE_TTL_SECONDS,
  );
  expect(expirationDate).toBeLessThanOrEqual(
    after + SESSION_COOKIE_TTL_SECONDS,
  );
});

test('registerPersistSessionCookies ignores removed, persistent, overwrite, and out-of-scope cookies', async () => {
  const session = {} as Session;
  const { listeners, set } = captureCookieListener(session);

  registerPersistSessionCookies(session, edclubOptions);

  listeners[0]({}, makeSessionCookie(), 'explicit', true);
  listeners[0](
    {},
    makeSessionCookie({ session: false }),
    'explicit',
    false,
  );
  listeners[0]({}, makeSessionCookie(), 'overwrite', false);
  listeners[0](
    {},
    makeSessionCookie({ domain: '.doubleclick.net' }),
    'explicit',
    false,
  );

  await Promise.resolve();

  expect(set).not.toHaveBeenCalled();
});
