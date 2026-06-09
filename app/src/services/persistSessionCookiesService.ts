import type { Cookie, Session } from 'electron';

import { linkIsInternal } from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import type { WindowOptions } from '../runtimeContract';

const registeredSessions = new WeakSet<Session>();

/** Two weeks; matches common Electron session-cookie persistence workarounds. */
export const SESSION_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 14;

export type PersistSessionCookiesOptions = Pick<
  WindowOptions,
  'targetUrl' | 'internalUrls' | 'strictInternalUrls'
>;

function cookieToUrl(cookie: Cookie): string | undefined {
  if (!cookie.domain) {
    return undefined;
  }

  const host = cookie.domain.startsWith('.')
    ? cookie.domain.slice(1)
    : cookie.domain;
  if (!host) {
    return undefined;
  }

  const protocol = cookie.secure ? 'https' : 'http';
  return `${protocol}://${host}${cookie.path ?? '/'}`;
}

export function isCookieInAppScope(
  cookie: Cookie,
  options: PersistSessionCookiesOptions,
): boolean {
  if (!cookie.domain) {
    return false;
  }

  const host = cookie.domain.startsWith('.')
    ? cookie.domain.slice(1)
    : cookie.domain;
  if (!host) {
    return false;
  }

  try {
    return linkIsInternal(
      options.targetUrl,
      `https://${host}/`,
      options.internalUrls,
      options.strictInternalUrls,
    );
  } catch (err: unknown) {
    log.debug('persistSessionCookiesService: cookie scope check failed', {
      domain: cookie.domain,
      err,
    });
    return false;
  }
}

async function persistSessionCookie(
  session: Session,
  cookie: Cookie,
): Promise<void> {
  const url = cookieToUrl(cookie);
  if (!url) {
    return;
  }

  await session.cookies.set({
    url,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: Math.floor(Date.now() / 1000) + SESSION_COOKIE_TTL_SECONDS,
  });
}

/**
 * When enabled via `--persist-session-cookies`, promotes session cookies to
 * persistent cookies for domains that match the app's navigation policy
 * (`targetUrl`, `internal-urls`, known login pages). Electron otherwise drops
 * session cookies on exit.
 */
export function registerPersistSessionCookies(
  session: Session,
  options: PersistSessionCookiesOptions,
): void {
  if (registeredSessions.has(session)) {
    return;
  }
  registeredSessions.add(session);

  session.cookies.on('changed', (_event, cookie, cause, removed) => {
    if (removed || !cookie.session || cause !== 'explicit') {
      return;
    }

    if (!isCookieInAppScope(cookie, options)) {
      return;
    }

    persistSessionCookie(session, cookie).catch((err: unknown) => {
      log.debug('persistSessionCookiesService: failed to persist cookie', {
        name: cookie.name,
        domain: cookie.domain,
        err,
      });
    });
  });
}
