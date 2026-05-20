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
