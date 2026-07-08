import { contextBridge, IpcRenderer } from 'electron';

import type { SessionInteractionRequest } from '../adapters/sessionAdapter';

export type SessionInteractionResult = {
  id?: string;
  value?: unknown;
  error?: Error | { message?: string };
};

export type WebholmSessionBridge = {
  get<T = unknown>(property: string, options?: { id?: string }): Promise<T>;
  set(
    property: string,
    propertyValue: unknown,
    options?: { id?: string },
  ): Promise<unknown>;
  call<T = unknown>(
    func: string,
    funcArgs?: unknown[],
    options?: { id?: string },
  ): Promise<T>;
};

export type WebholmBridge = {
  session: WebholmSessionBridge;
};

/** @deprecated Use {@link WebholmSessionBridge}. */
export type NativefierSessionBridge = WebholmSessionBridge;

/** @deprecated Use {@link WebholmBridge}. */
export type NativefierBridge = WebholmBridge;

let sessionRequestCounter = 0;

function createSessionRequestId(explicit?: string): string {
  return explicit ?? `webholm-session-${++sessionRequestCounter}`;
}

function rejectSessionError(
  result: SessionInteractionResult,
): Error | undefined {
  if (result.error === undefined) {
    return undefined;
  }
  if (result.error instanceof Error) {
    return result.error;
  }
  const message =
    typeof result.error === 'object' &&
    result.error !== null &&
    'message' in result.error
      ? String((result.error as { message?: string }).message)
      : JSON.stringify(result.error);
  return new Error(message);
}

export function sendSessionInteraction(
  ipcRenderer: IpcRenderer,
  request: SessionInteractionRequest,
): Promise<SessionInteractionResult> {
  const id = createSessionRequestId(request.id);
  const payload: SessionInteractionRequest = { ...request, id };

  return new Promise((resolve, reject) => {
    const onReply = (
      _event: unknown,
      result: SessionInteractionResult,
    ): void => {
      if (result.id !== undefined && result.id !== id) {
        return;
      }
      ipcRenderer.removeListener('session-interaction-reply', onReply);
      const err = rejectSessionError(result);
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    };

    ipcRenderer.on('session-interaction-reply', onReply);
    ipcRenderer.send('session-interaction', payload);
  });
}

export function createWebholmSessionBridge(
  ipcRenderer: IpcRenderer,
): WebholmSessionBridge {
  return {
    get<T = unknown>(property: string, options?: { id?: string }): Promise<T> {
      return sendSessionInteraction(ipcRenderer, {
        property,
        id: options?.id,
      }).then((result) => result.value as T);
    },
    set(
      property: string,
      propertyValue: unknown,
      options?: { id?: string },
    ): Promise<unknown> {
      return sendSessionInteraction(ipcRenderer, {
        property,
        propertyValue,
        id: options?.id,
      }).then((result) => result.value);
    },
    call<T = unknown>(
      func: string,
      funcArgs?: unknown[],
      options?: { id?: string },
    ): Promise<T> {
      return sendSessionInteraction(ipcRenderer, {
        func,
        funcArgs,
        id: options?.id,
      }).then((result) => result.value as T);
    },
  };
}

/** @deprecated Use {@link createWebholmSessionBridge}. */
export const createNativefierSessionBridge = createWebholmSessionBridge;

export function createWebholmBridge(ipcRenderer: IpcRenderer): WebholmBridge {
  return {
    session: createWebholmSessionBridge(ipcRenderer),
  };
}

/** @deprecated Use {@link createWebholmBridge}. */
export const createNativefierBridge = createWebholmBridge;

export function exposeWebholmBridge(bridge: WebholmBridge): void {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('webholm', bridge);
    contextBridge.exposeInMainWorld('nativefier', bridge);
    return;
  }
  const w = window as Window &
    typeof globalThis & {
      webholm?: WebholmBridge;
      nativefier?: WebholmBridge;
    };
  w.webholm = bridge;
  w.nativefier = bridge;
}

/** @deprecated Use {@link exposeWebholmBridge}. */
export const exposeNativefierBridge = exposeWebholmBridge;

export function assignPreloadWebholmGlobal(bridge: WebholmBridge): void {
  const g = globalThis as typeof globalThis & {
    webholm?: WebholmBridge;
    nativefier?: WebholmBridge;
  };
  g.webholm = bridge;
  g.nativefier = bridge;
}

/** @deprecated Use {@link assignPreloadWebholmGlobal}. */
export const assignPreloadNativefierGlobal = assignPreloadWebholmGlobal;

export function setupWebholmBridge(ipcRenderer: IpcRenderer): WebholmBridge {
  const bridge = createWebholmBridge(ipcRenderer);
  exposeWebholmBridge(bridge);
  assignPreloadWebholmGlobal(bridge);
  return bridge;
}

/** @deprecated Use {@link setupWebholmBridge}. */
export const setupNativefierBridge = setupWebholmBridge;
