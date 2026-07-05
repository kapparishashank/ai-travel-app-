const allowedProtocols = ['https:', 'http:', 'tel:', 'mailto:'];

export function isSafeExternalUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function describeExternalUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'tel:') return 'device dialer';
    if (parsed.protocol === 'mailto:') return 'email app';
    return parsed.hostname;
  } catch {
    return 'external app';
  }
}
