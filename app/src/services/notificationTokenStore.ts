import { randomUUID } from 'crypto';

const tokensByWebContentsId = new Map<number, string>();

export function rotateToken(webContentsId: number): string {
  const token = randomUUID();
  tokensByWebContentsId.set(webContentsId, token);
  return token;
}

export function getToken(webContentsId: number): string | undefined {
  return tokensByWebContentsId.get(webContentsId);
}

export function validateToken(webContentsId: number, token: string): boolean {
  return tokensByWebContentsId.get(webContentsId) === token;
}

export function clearToken(webContentsId: number): void {
  tokensByWebContentsId.delete(webContentsId);
}

/** Test-only: reset in-memory token map. */
export function resetNotificationTokensForTests(): void {
  tokensByWebContentsId.clear();
}
