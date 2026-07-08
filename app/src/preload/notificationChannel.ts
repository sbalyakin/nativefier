export const NOTIFY_POST_MESSAGE_CHANNEL = 'webholm:notify:v1';

/** Legacy upstream channel; still accepted for dual-read compatibility. */
export const LEGACY_NOTIFY_POST_MESSAGE_CHANNEL = 'nativefier:notify:v1';

export const NOTIFY_IPC_CHANNEL = 'webholm-notify';

/** Legacy upstream IPC channel; still accepted for dual-read compatibility. */
export const LEGACY_NOTIFY_IPC_CHANNEL = 'nativefier-notify';

export const NOTIFY_POST_MESSAGE_CHANNELS = [
  NOTIFY_POST_MESSAGE_CHANNEL,
  LEGACY_NOTIFY_POST_MESSAGE_CHANNEL,
] as const;

export const NOTIFY_IPC_CHANNELS = [
  NOTIFY_IPC_CHANNEL,
  LEGACY_NOTIFY_IPC_CHANNEL,
] as const;

export type WebholmNotifyOp = 'create' | 'click';

/** @deprecated Use {@link WebholmNotifyOp}. */
export type NativefierNotifyOp = WebholmNotifyOp;

export type WebholmNotifyMessage = {
  channel:
    | typeof NOTIFY_POST_MESSAGE_CHANNEL
    | typeof LEGACY_NOTIFY_POST_MESSAGE_CHANNEL;
  token: string;
  op: WebholmNotifyOp;
  title?: string;
  opt?: NotificationOptions;
};

/** @deprecated Use {@link WebholmNotifyMessage}. */
export type NativefierNotifyMessage = WebholmNotifyMessage;

export type WebholmNotifyIpcPayload = {
  token: string;
  op: WebholmNotifyOp;
  title?: string;
  opt?: NotificationOptions;
};

/** @deprecated Use {@link WebholmNotifyIpcPayload}. */
export type NativefierNotifyIpcPayload = WebholmNotifyIpcPayload;
