import electronDownload from 'electron-dl';

export function configureFileDownloads(options: Record<string, unknown>): void {
  electronDownload({ ...options });
}
