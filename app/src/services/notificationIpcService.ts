import { onIpcMainEvent } from '../adapters/ipcAdapter';
import {
  NOTIFY_IPC_CHANNELS,
  type WebholmNotifyIpcPayload,
  type WebholmNotifyOp,
} from '../preload/notificationChannel';
import * as log from '../helpers/loggingHelper';
import { validateToken } from './notificationTokenStore';

const TITLE_MAX_LENGTH = 1024;
const OPT_MAX_JSON_BYTES = 8192;
const CREATE_RATE_LIMIT_MS = 1000;

const lastCreateAtByWebContentsId = new Map<number, number>();
const badgePendingByWebContentsId = new Map<number, boolean>();

let ipcHandlerRegistered = false;
const onCreateHandlers: Array<(webContentsId: number) => void> = [];
const onClickHandlers: Array<() => void> = [];

export type NotificationIpcHandlers = {
  onCreate?: (webContentsId: number) => void;
  onClick?: () => void;
};

function isValidOp(op: unknown): op is WebholmNotifyOp {
  return op === 'create' || op === 'click';
}

function isJsonSerializable(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function isValidCreatePayload(msg: WebholmNotifyIpcPayload): boolean {
  if (typeof msg.title !== 'string' || msg.title.length > TITLE_MAX_LENGTH) {
    return false;
  }
  if (msg.opt === undefined) {
    return true;
  }
  if (!isJsonSerializable(msg.opt)) {
    return false;
  }
  const serialized = JSON.stringify(msg.opt);
  return serialized.length <= OPT_MAX_JSON_BYTES;
}

function handleNotifyMessage(
  event: { sender: { id: number } },
  msg: WebholmNotifyIpcPayload,
): void {
  log.debug('ipcMain.webholm-notify', { msg });

  if (
    typeof msg !== 'object' ||
    msg === null ||
    typeof msg.token !== 'string' ||
    !isValidOp(msg.op)
  ) {
    return;
  }

  const webContentsId = event.sender.id;
  if (!validateToken(webContentsId, msg.token)) {
    log.debug('notificationIpcService: invalid token', { webContentsId });
    return;
  }

  if (msg.op === 'create') {
    if (!isValidCreatePayload(msg)) {
      log.debug('notificationIpcService: invalid create payload', {
        webContentsId,
      });
      return;
    }

    const now = Date.now();
    const lastCreate = lastCreateAtByWebContentsId.get(webContentsId) ?? 0;
    if (now - lastCreate < CREATE_RATE_LIMIT_MS) {
      return;
    }
    lastCreateAtByWebContentsId.set(webContentsId, now);
    badgePendingByWebContentsId.set(webContentsId, true);

    for (const handler of onCreateHandlers) {
      handler(webContentsId);
    }
    return;
  }

  if (!badgePendingByWebContentsId.get(webContentsId)) {
    return;
  }

  badgePendingByWebContentsId.delete(webContentsId);
  for (const handler of onClickHandlers) {
    handler();
  }
}

function ensureIpcHandlerRegistered(): void {
  if (ipcHandlerRegistered) {
    return;
  }
  ipcHandlerRegistered = true;

  for (const channel of NOTIFY_IPC_CHANNELS) {
    onIpcMainEvent(channel, (event, msg: WebholmNotifyIpcPayload) => {
      handleNotifyMessage(event, msg);
    });
  }
}

export function registerNotificationIpcHandlers(
  handlers: NotificationIpcHandlers,
): void {
  if (handlers.onCreate) {
    onCreateHandlers.push(handlers.onCreate);
  }
  if (handlers.onClick) {
    onClickHandlers.push(handlers.onClick);
  }
  ensureIpcHandlerRegistered();
}

export function clearNotificationBadgeState(webContentsId: number): void {
  badgePendingByWebContentsId.delete(webContentsId);
  lastCreateAtByWebContentsId.delete(webContentsId);
}

/** Test-only: reset handler registration and in-memory guard state. */
export function resetNotificationIpcServiceForTests(): void {
  ipcHandlerRegistered = false;
  onCreateHandlers.length = 0;
  onClickHandlers.length = 0;
  lastCreateAtByWebContentsId.clear();
  badgePendingByWebContentsId.clear();
}
