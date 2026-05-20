import {
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  NativeImage,
  Tray,
} from 'electron';

export function createEmptyTray(): Tray {
  return new Tray(nativeImage.createEmpty());
}

export function loadNativeImageFromPath(iconPath: string): NativeImage {
  return nativeImage.createFromPath(iconPath);
}

export function buildTrayContextMenu(
  template: MenuItemConstructorOptions[],
): Menu {
  return Menu.buildFromTemplate(template);
}

export function setTrayImage(tray: Tray, image: NativeImage): void {
  tray.setImage(image);
}

export function resizeNativeImage(
  image: NativeImage,
  options: { height: number },
): NativeImage {
  return image.resize(options);
}

export function getTrayBounds(tray: Tray): ReturnType<Tray['getBounds']> {
  return tray.getBounds();
}

export function onTrayEvent(
  tray: Tray,
  event: 'click' | 'right-click' | 'double-click',
  listener: (...args: unknown[]) => void,
): void {
  // Tray.on overloads are narrow; runtime accepts standard tray events.
  (tray.on as (e: string, fn: (...args: unknown[]) => void) => void)(
    event,
    listener,
  );
}

export function setTrayToolTip(tray: Tray, toolTip: string): void {
  tray.setToolTip(toolTip);
}

export function setTrayContextMenu(tray: Tray, menu: Menu): void {
  tray.setContextMenu(menu);
}
