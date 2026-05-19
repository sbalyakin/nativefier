export function getHostnameFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

export function getAppNameFromHostname(hostname: string): string {
  const withoutWww = hostname.replace(/^www\./i, '');
  const namePart = withoutWww.split('.')[0];
  if (!namePart) {
    return withoutWww;
  }
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}
