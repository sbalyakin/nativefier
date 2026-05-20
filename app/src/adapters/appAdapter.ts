import { EventEmitter } from 'events';

import { app, systemPreferences } from 'electron';

export function exitApp(code?: number): void {
  app.exit(code);
}

export function quitApp(): void {
  app.quit();
}

/** Forwards to `app.on` without Electron's per-overload `Parameters<typeof app.on>` trap. */
export function onAppEvent(
  event: string,
  listener: (...args: unknown[]) => void,
): void {
  (app as EventEmitter).on(event, listener);
}

export function requestSingleInstanceLock(): boolean {
  return app.requestSingleInstanceLock();
}

export function setAppPath(name: 'appData' | 'userData', path: string): void {
  app.setPath(name, path);
}

export function getAppName(): string {
  return app.getName();
}

export function getAppVersion(): string {
  return app.getVersion();
}

export function setAppUserModelId(id: string): void {
  app.setAppUserModelId(id);
}

export function setUserAgentFallback(userAgent: string): void {
  app.userAgentFallback = userAgent;
}

export function getUserAgentFallback(): string {
  return app.userAgentFallback;
}

export function appendCommandLineSwitch(name: string, value?: string): void {
  if (value === undefined) {
    app.commandLine.appendSwitch(name);
  } else {
    app.commandLine.appendSwitch(name, value);
  }
}

export function disableHardwareAcceleration(): void {
  app.disableHardwareAcceleration();
}

export function setDockBadge(text: string): void {
  app.dock?.setBadge(text);
}

export function bounceDock(): void {
  app.dock?.bounce();
}

export function isTrustedAccessibilityClient(prompt: boolean): boolean {
  return systemPreferences.isTrustedAccessibilityClient(prompt);
}
