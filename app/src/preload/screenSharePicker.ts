export const SCREEN_SHARE_PICKER_BASE_ID = 'native-screen-share-picker';

export type ScreenShareThumbnail = {
  toDataURL: () => string;
};

export type ScreenShareSource = {
  id: string;
  name: string;
  thumbnail: ScreenShareThumbnail;
};

export function screenSharePickerCloseId(baseId: string): string {
  return `${baseId}-close`;
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildScreenShareSourceItemHtml(
  source: ScreenShareSource,
): string {
  const { id, name, thumbnail } = source;
  const safeId = escapeHtmlAttribute(id);
  const safeName = escapeHtmlAttribute(name);
  return `
          <li class="desktop-capturer-selection__item">
            <button class="desktop-capturer-selection__btn" data-id="${safeId}" title="${safeName}">
              <img class="desktop-capturer-selection__thumbnail" src="${thumbnail.toDataURL()}" />
              <span class="desktop-capturer-selection__name">${safeName}</span>
            </button>
          </li>
        `;
}

export function buildScreenShareSourcesListHtml(
  sources: ScreenShareSource[],
): string {
  return sources.map(buildScreenShareSourceItemHtml).join('');
}

export function buildScreenSharePickerInnerHtml(
  baseId: string,
  sources: ScreenShareSource[],
): string {
  const closeId = screenSharePickerCloseId(baseId);
  return `
    <button class="desktop-capturer-selection__close" id="${closeId}" aria-label="Close screen share picker" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="currentColor" d="m12 10.586 4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z"/>   
      </svg>
    </button>
    <div class="desktop-capturer-selection__scroller">
      <ul class="desktop-capturer-selection__list">
        ${buildScreenShareSourcesListHtml(sources)}
      </ul>
    </div>
    `;
}

export const SCREEN_SHARE_PICKER_STYLES = `
  .desktop-capturer-selection {
    --overlay-color: hsla(0, 0%, 11.8%, 0.75);
    --highlight-color: highlight;
    --text-content-color: #fff;
    --selection-button-color: hsl(180, 1.3%, 14.7%);
  }
  .desktop-capturer-selection {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: var(--overlay-color);
    color: var(--text-content-color);
    z-index: 10000000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .desktop-capturer-selection__close {
    -moz-appearance: none;
    -webkit-appearance: none;
    appearance: none;
    padding: 1rem;
    color: inherit;
    position: absolute;
    left: 1rem;
    top: 1rem;
    cursor: pointer;
  }
  .desktop-capturer-selection__scroller {
    width: 100%;
    max-height: 100vh;
    overflow-y: auto;
  }
  .desktop-capturer-selection__list {
    max-width: calc(100% - 100px);
    margin: 50px;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    overflow: hidden;
    justify-content: center;
  }
  .desktop-capturer-selection__item {
    display: flex;
    margin: 4px;
  }
  .desktop-capturer-selection__btn {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 145px;
    margin: 0;
    border: 0;
    border-radius: 3px;
    padding: 4px;
    background: var(--selection-button-color);
    text-align: left;
    transition: background-color .15s, box-shadow .15s;
  }
  .desktop-capturer-selection__btn:hover,
  .desktop-capturer-selection__btn:focus {
    background: var(--highlight-color);
  }
  .desktop-capturer-selection__thumbnail {
    width: 100%;
    height: 81px;
    object-fit: cover;
  }
  .desktop-capturer-selection__name {
    margin: 6px 0 6px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  @media (prefers-color-scheme: light) {
    .desktop-capturer-selection {
      --overlay-color: hsla(0, 0%, 90.2%, 0.75);
      --text-content-color: hsl(0, 0%, 12.9%);
      --selection-button-color: hsl(180, 1.3%, 85.3%);
    }
  }`;
