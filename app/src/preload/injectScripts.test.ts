import {
  injectJsRelativePath,
  isInjectJsFile,
  listInjectJsRelativePaths,
} from './injectScripts';

test('isInjectJsFile accepts only .js files', () => {
  expect(isInjectJsFile('foo.js', true)).toBe(true);
  expect(isInjectJsFile('foo.ts', true)).toBe(false);
  expect(isInjectJsFile('foo.js', false)).toBe(false);
});

test('injectJsRelativePath builds require path under inject dir', () => {
  expect(injectJsRelativePath('custom.js')).toBe('../inject/custom.js');
});

test('listInjectJsRelativePaths filters and maps inject entries', () => {
  const paths = listInjectJsRelativePaths([
    { name: 'a.js', isFile: (): boolean => true },
    { name: 'b.css', isFile: (): boolean => true },
    { name: 'c.js', isFile: (): boolean => false },
    { name: 'd.js', isFile: (): boolean => true },
  ]);
  expect(paths).toEqual(['../inject/a.js', '../inject/d.js']);
});
