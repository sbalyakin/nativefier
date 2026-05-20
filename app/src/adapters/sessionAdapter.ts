import { Session, type WebRequestFilter } from 'electron';

import type {
  BrowserWindow,
  OnResponseStartedListenerDetails,
} from './electronTypes';

export type SessionInteractionRequest = {
  id?: string;
  func?: string;
  funcArgs?: unknown[];
  property?: string;
  propertyValue?: unknown;
};

export function getBrowserWindowSession(window: BrowserWindow): Session {
  return window.webContents.session;
}

export function setDefaultPermissionHandlers(session: Session): void {
  session.setPermissionCheckHandler(() => true);
  session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(true);
    },
  );
}

export async function clearSessionData(session: Session): Promise<void> {
  await session.clearStorageData();
  await session.clearCache();
}

export function setSessionProxy(
  session: Session,
  proxyRules?: string,
): Promise<void> {
  return session.setProxy({
    proxyRules,
    pacScript: '',
    proxyBypassRules: '',
  });
}

export function onSessionWebRequestResponseStarted(
  session: Session,
  filter: WebRequestFilter,
  listener: (details: OnResponseStartedListenerDetails) => void,
): void {
  session.webRequest.onResponseStarted(filter, listener);
}

/**
 * Normalizes `funcArgs` for `session-interaction` IPC (see API.md).
 *
 * Documented contract: callers should send an array. Legacy main-process behavior:
 * - null/undefined → no arguments
 * - non-iterable scalars (number, plain object, …) → one argument `[value]`
 * - arrays → spread as multiple arguments
 * - other iterables (including bare strings) → spread iterator items; a string becomes
 *   one char per argument (`'solo'` → `'s','o','l','o'`), not a single string arg
 *
 * PR3 must use this helper before `invokeSessionMethod` so spread semantics stay aligned.
 */
export function normalizeSessionFuncArgs(funcArgs: unknown): unknown[] {
  if (funcArgs === undefined || funcArgs === null) {
    return [];
  }
  if (
    typeof (funcArgs as { [Symbol.iterator]?: unknown })[Symbol.iterator] !==
    'function'
  ) {
    return [funcArgs];
  }
  if (Array.isArray(funcArgs)) {
    return funcArgs;
  }
  return [...(funcArgs as Iterable<unknown>)];
}

export function invokeSessionMethod(
  session: Session,
  func: string,
  funcArgs: unknown[],
): unknown {
  // Dynamic access mirrors preload session-interaction IPC protocol.
  // @ts-expect-error accessing a func by string name
  return session[func](...funcArgs);
}

export function setSessionProperty(
  session: Session,
  property: string,
  propertyValue: unknown,
): void {
  // @ts-expect-error setting a property by string name
  session[property] = propertyValue;
}

export function getSessionProperty(
  session: Session,
  property: string,
): unknown {
  // @ts-expect-error accessing a property by string name
  return session[property];
}
