import { desktopCapturer } from 'electron';
import type {
  DesktopCapturerSource,
  WebContents,
  WebFrameMain,
} from 'electron';

// WebContents is not exported as a value on the electron namespace in Electron 42 typings.
const electron = require('electron') as {
  WebContents: {
    fromFrame(frame: WebFrameMain): WebContents | undefined;
  };
};

export function getDesktopCapturerSources(options: {
  types: ('screen' | 'window')[];
}): Promise<DesktopCapturerSource[]> {
  return desktopCapturer.getSources(options);
}

export function getWebContentsFromFrame(
  frame: WebFrameMain,
): WebContents | undefined {
  return electron.WebContents.fromFrame(frame);
}
