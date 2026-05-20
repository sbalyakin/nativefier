import {
  SCREEN_SHARE_PICKER_BASE_ID,
  buildScreenSharePickerInnerHtml,
  buildScreenShareSourceItemHtml,
  escapeHtmlAttribute,
  screenSharePickerCloseId,
  type ScreenShareSource,
} from './screenSharePicker';

const mockSource: ScreenShareSource = {
  id: 'screen:0:0',
  name: 'Entire screen',
  thumbnail: {
    toDataURL: () => 'data:image/png;base64,thumb',
  } as ScreenShareSource['thumbnail'],
};

test('screenSharePickerCloseId appends -close suffix', () => {
  expect(screenSharePickerCloseId(SCREEN_SHARE_PICKER_BASE_ID)).toBe(
    'native-screen-share-picker-close',
  );
});

test('buildScreenShareSourceItemHtml includes source metadata', () => {
  const html = buildScreenShareSourceItemHtml(mockSource);
  expect(html).toContain('data-id="screen:0:0"');
  expect(html).toContain('title="Entire screen"');
  expect(html).toContain('data:image/png;base64,thumb');
  expect(html).toContain('Entire screen');
});

test('escapeHtmlAttribute escapes quotes in source names', () => {
  expect(escapeHtmlAttribute('Say "hello"')).toBe('Say &quot;hello&quot;');
  const html = buildScreenShareSourceItemHtml({
    ...mockSource,
    name: 'Window "A"',
  });
  expect(html).toContain('title="Window &quot;A&quot;"');
});

test('buildScreenSharePickerInnerHtml renders close button and source list', () => {
  const html = buildScreenSharePickerInnerHtml(SCREEN_SHARE_PICKER_BASE_ID, [
    mockSource,
  ]);
  expect(html).toContain('id="native-screen-share-picker-close"');
  expect(html).toContain('desktop-capturer-selection__list');
  expect(html).toContain('data-id="screen:0:0"');
});
