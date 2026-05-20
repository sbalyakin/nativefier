import { Menu, MenuItemConstructorOptions } from 'electron';

export function buildApplicationMenu(
  template: MenuItemConstructorOptions[],
): Menu {
  return Menu.buildFromTemplate(template);
}

export function setApplicationMenu(menu: Menu | null): void {
  Menu.setApplicationMenu(menu);
}
