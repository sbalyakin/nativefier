import { Menu, MenuItem, MenuItemConstructorOptions } from 'electron';

export function buildApplicationMenu(
  template: MenuItemConstructorOptions[],
): Menu {
  return Menu.buildFromTemplate(template);
}

export function setApplicationMenu(menu: Menu | null): void {
  Menu.setApplicationMenu(menu);
}

export function getApplicationMenu(): Menu | null {
  return Menu.getApplicationMenu();
}

export function getMenuItemById(menu: Menu, id: string): MenuItem | null {
  return menu.getMenuItemById(id);
}
