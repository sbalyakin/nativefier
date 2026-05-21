import type {
  DesktopCapturerSource,
  DisplayMediaRequestHandlerHandlerRequest,
  Session,
  Streams,
  WebContents,
} from 'electron';

import {
  getDesktopCapturerSources,
  getWebContentsFromFrame,
} from '../adapters/desktopCapturerAdapter';
import { isWayland } from '../helpers/helpers';
import * as log from '../helpers/loggingHelper';
import {
  SCREEN_SHARE_PICKER_BASE_ID,
  SCREEN_SHARE_PICKER_STYLES,
  buildScreenSharePickerInnerHtml,
  type ScreenShareSource,
} from '../preload/screenSharePicker';
import { pickScreenShareSourceInPage } from './screenSharePickerPageScript';

const registeredSessions = new WeakSet<Session>();

function toScreenShareSources(
  sources: DesktopCapturerSource[],
): ScreenShareSource[] {
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail,
  }));
}

async function pickScreenShareSourceIdInWebContents(
  webContents: WebContents,
  sources: ScreenShareSource[],
): Promise<string | null> {
  const innerHtml = buildScreenSharePickerInnerHtml(
    SCREEN_SHARE_PICKER_BASE_ID,
    sources,
  );
  const pickerArgs = {
    baseId: SCREEN_SHARE_PICKER_BASE_ID,
    innerHtml,
    styleCss: SCREEN_SHARE_PICKER_STYLES,
  };
  const script = `(${pickScreenShareSourceInPage})(${JSON.stringify(pickerArgs)})`;

  try {
    const sourceId = await webContents.executeJavaScript(script, true);
    if (typeof sourceId !== 'string') {
      return null;
    }
    return sources.some((source) => source.id === sourceId) ? sourceId : null;
  } catch (err: unknown) {
    log.debug('displayMediaService: picker cancelled or failed', err);
    return null;
  }
}

async function resolveDisplayMediaStreams(
  request: DisplayMediaRequestHandlerHandlerRequest,
  callback: (streams: Streams) => void,
): Promise<void> {
  try {
    const sources = await getDesktopCapturerSources({
      types: ['screen', 'window'],
    });
    if (sources.length === 0) {
      callback({});
      return;
    }

    let picked: DesktopCapturerSource | null = null;

    if (isWayland()) {
      picked = sources[0];
    } else {
      const webContents = request.frame
        ? getWebContentsFromFrame(request.frame)
        : undefined;
      if (!webContents || webContents.isDestroyed()) {
        callback({});
        return;
      }
      const pickedId = await pickScreenShareSourceIdInWebContents(
        webContents,
        toScreenShareSources(sources),
      );
      picked = pickedId
        ? (sources.find((source) => source.id === pickedId) ?? null)
        : null;
    }

    if (!picked) {
      callback({});
      return;
    }

    // Video only: Meet/Teams tab audio is usually mixed by Chromium. For explicit
    // system/tab audio, consider Streams.audio (e.g. loopback on Windows).
    // Picker runs on the requesting frame's top-level WebContents; nested iframes
    // are not targeted.
    callback({
      video: {
        id: picked.id,
        name: picked.name,
      },
    });
  } catch (err: unknown) {
    log.error('displayMediaService: handler error', err);
    callback({});
  }
}

export function registerDisplayMediaRequestHandler(session: Session): void {
  if (registeredSessions.has(session)) {
    return;
  }
  registeredSessions.add(session);

  session.setDisplayMediaRequestHandler((request, callback) => {
    void resolveDisplayMediaStreams(request, callback);
  });
}
