import { setupIpcEvents } from './ipcEvents';

test('setupIpcEvents registers params and debug handlers', () => {
  const handlers: Record<string, (event: unknown, message: string) => void> =
    {};
  const ipcRenderer = {
    on: jest.fn((channel: string, handler: (typeof handlers)[string]) => {
      handlers[channel] = handler;
    }),
  };
  const log = {
    debug: jest.fn(),
    info: jest.fn(),
  } as unknown as Console;

  setupIpcEvents(ipcRenderer as never, log);

  expect(ipcRenderer.on).toHaveBeenCalledWith('params', expect.any(Function));
  expect(ipcRenderer.on).toHaveBeenCalledWith('debug', expect.any(Function));

  handlers.params('event', '{"name":"App"}');
  expect(log.info).toHaveBeenCalledWith('webholm.json', { name: 'App' });

  handlers.debug('event', 'trace');
  expect(log.debug).toHaveBeenCalledWith('ipcRenderer.debug', {
    event: 'event',
    message: 'trace',
  });
});
