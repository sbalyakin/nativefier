import { bounceDock, setDockBadge } from '../adapters/appAdapter';
import { isOSX } from '../helpers/helpers';

export type DockBadgeSetter = (
  count?: number | string,
  bounce?: boolean,
) => void;

export function createDockBadgeSetter(): DockBadgeSetter {
  if (!isOSX()) {
    return (): void => undefined;
  }

  let currentBadgeCount = 0;

  return (count?: number | string, bounce = false): void => {
    if (count !== undefined) {
      setDockBadge(count.toString());
      if (bounce && typeof count === 'number' && count > currentBadgeCount) {
        bounceDock();
      }
      currentBadgeCount = typeof count === 'number' ? count : 0;
    }
  };
}
