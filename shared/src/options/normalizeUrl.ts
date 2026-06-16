function hasProtocol(inputUrl: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(inputUrl);
}

function appendProtocol(inputUrl: string): string {
  if (!hasProtocol(inputUrl)) {
    return `https://${inputUrl}`;
  }
  return inputUrl;
}

export function normalizeUrl(urlToNormalize: string): string {
  const trimmed = urlToNormalize.trim();
  const urlWithProtocol = appendProtocol(trimmed);

  try {
    return new URL(urlWithProtocol).toString();
  } catch {
    throw new Error(`Your url "${urlWithProtocol}" is invalid`);
  }
}
