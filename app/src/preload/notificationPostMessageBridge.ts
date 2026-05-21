import type { IpcRenderer } from 'electron';

import {
  NOTIFY_IPC_CHANNEL,
  NOTIFY_POST_MESSAGE_CHANNEL,
  type NativefierNotifyIpcPayload,
  type NativefierNotifyOp,
} from './notificationChannel';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isValidOp(op: unknown): op is NativefierNotifyOp {
  return op === 'create' || op === 'click';
}

export function handleNotificationPostMessage(
  ipcRenderer: IpcRenderer,
  event: MessageEvent,
): void {
  if (event.source !== window) {
    return;
  }

  const data = event.data;
  if (
    typeof data !== 'object' ||
    data === null ||
    data.channel !== NOTIFY_POST_MESSAGE_CHANNEL
  ) {
    return;
  }

  if (typeof data.token !== 'string' || !isValidOp(data.op)) {
    return;
  }

  if (data.op === 'create') {
    if (typeof data.title !== 'string') {
      return;
    }
    if (data.opt !== undefined && !isPlainObject(data.opt)) {
      return;
    }
  }

  const payload: NativefierNotifyIpcPayload = {
    token: data.token,
    op: data.op,
  };
  if (data.op === 'create') {
    payload.title = data.title;
    if (data.opt !== undefined) {
      payload.opt = data.opt as NotificationOptions;
    }
  }

  ipcRenderer.send(NOTIFY_IPC_CHANNEL, payload);
}

export function setupNotificationPostMessageBridge(
  ipcRenderer: IpcRenderer,
): void {
  window.addEventListener('message', (event) => {
    handleNotificationPostMessage(ipcRenderer, event);
  });
}
