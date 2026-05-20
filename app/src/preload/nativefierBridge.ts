import { contextBridge, IpcRenderer } from 'electron';

import type { SessionInteractionRequest } from '../adapters/sessionAdapter';

export type SessionInteractionResult = {
  id?: string;
  value?: unknown;
  error?: Error | { message?: string };
};

export type NativefierSessionBridge = {
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

export type NativefierBridge = {
  session: NativefierSessionBridge;
};

let sessionRequestCounter = 0;

function createSessionRequestId(explicit?: string): string {
  return explicit ?? `nativefier-session-${++sessionRequestCounter}`;
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
      : String(result.error);
  return new Error(message);
}

export function sendSessionInteraction(
  ipcRenderer: IpcRenderer,
  request: SessionInteractionRequest,
): Promise<SessionInteractionResult> {
  const id = createSessionRequestId(request.id);
  const payload: SessionInteractionRequest = { ...request, id };

  return new Promise((resolve, reject) => {
    const onReply = (_event: unknown, result: SessionInteractionResult): void => {
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

export function createNativefierSessionBridge(
  ipcRenderer: IpcRenderer,
): NativefierSessionBridge {
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

export function createNativefierBridge(
  ipcRenderer: IpcRenderer,
): NativefierBridge {
  return {
    session: createNativefierSessionBridge(ipcRenderer),
  };
}

export function exposeNativefierBridge(bridge: NativefierBridge): void {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('nativefier', bridge);
    return;
  }
  const w = window as Window &
    typeof globalThis & { nativefier?: NativefierBridge };
  w.nativefier = bridge;
}

export function assignPreloadNativefierGlobal(bridge: NativefierBridge): void {
  (
    globalThis as typeof globalThis & { nativefier?: NativefierBridge }
  ).nativefier = bridge;
}

export function setupNativefierBridge(
  ipcRenderer: IpcRenderer,
): NativefierBridge {
  const bridge = createNativefierBridge(ipcRenderer);
  exposeNativefierBridge(bridge);
  assignPreloadNativefierGlobal(bridge);
  return bridge;
}
