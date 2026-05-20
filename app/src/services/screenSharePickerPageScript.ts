/**
 * Runs in the page main world via webContents.executeJavaScript.
 * Must not close over module scope — only browser globals.
 */
export function pickScreenShareSourceInPage(args: {
  baseId: string;
  innerHtml: string;
  styleCss: string;
}): Promise<string> {
  const { baseId, innerHtml, styleCss } = args;
  const pickerStylesElementId = `${baseId}-styles`;
  const closeId = `${baseId}-close`;

  return new Promise((resolve, reject) => {
    const clearElements = (): void => {
      document.getElementById(pickerStylesElementId)?.remove();
      document.getElementById(baseId)?.remove();
    };

    const screenShareStyles = document.createElement('style');
    screenShareStyles.id = pickerStylesElementId;
    screenShareStyles.innerHTML = styleCss;
    document.head.appendChild(screenShareStyles);

    const selectionElem = document.createElement('div');
    selectionElem.classList.add('desktop-capturer-selection');
    selectionElem.id = baseId;
    selectionElem.innerHTML = innerHtml;
    document.body.appendChild(selectionElem);

    document.getElementById(closeId)?.addEventListener('click', () => {
      clearElements();
      reject(new Error('Screen share was cancelled by the user.'));
    });

    document
      .querySelectorAll('.desktop-capturer-selection__btn')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.getAttribute('data-id');
          clearElements();
          if (!id) {
            reject(new Error('Screen share picker: missing data-id'));
            return;
          }
          resolve(id);
        });
      });
  });
}
