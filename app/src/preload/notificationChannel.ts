export const NOTIFY_POST_MESSAGE_CHANNEL = 'nativefier:notify:v1';

export const NOTIFY_IPC_CHANNEL = 'nativefier-notify';

export type NativefierNotifyOp = 'create' | 'click';

export type NativefierNotifyMessage = {
  channel: typeof NOTIFY_POST_MESSAGE_CHANNEL;
  token: string;
  op: NativefierNotifyOp;
  title?: string;
  opt?: NotificationOptions;
};

export type NativefierNotifyIpcPayload = {
  token: string;
  op: NativefierNotifyOp;
  title?: string;
  opt?: NotificationOptions;
};
