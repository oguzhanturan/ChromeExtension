import { SharePayload } from '../types/tab-group';

const SHARE_PREFIX = 'tgs:';

export function encode(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const latin1 = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return SHARE_PREFIX + btoa(latin1);
}

export function decode(shareCode: string): SharePayload {
  const trimmed = shareCode.trim();

  if (!trimmed.startsWith(SHARE_PREFIX)) {
    throw new Error('Invalid share code: missing "tgs:" prefix.');
  }

  const base64 = trimmed.slice(SHARE_PREFIX.length);

  let json: string;
  try {
    const latin1 = atob(base64);
    const bytes = Uint8Array.from(latin1, (c) => c.charCodeAt(0));
    json = new TextDecoder().decode(bytes);
  } catch {
    throw new Error('Invalid share code: could not decode base64 data.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new Error('Invalid share code: malformed JSON data.');
  }

  if (!isValidPayload(payload)) {
    throw new Error('Invalid share code: unexpected data format.');
  }

  return payload;
}

function isValidPayload(data: unknown): data is SharePayload {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (obj.version !== 1) return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.color !== 'string') return false;
  if (!Array.isArray(obj.tabs)) return false;

  const validColors = [
    'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange',
  ];
  if (!validColors.includes(obj.color)) return false;

  return obj.tabs.every(
    (tab: unknown) =>
      typeof tab === 'object' &&
      tab !== null &&
      typeof (tab as Record<string, unknown>).url === 'string' &&
      typeof (tab as Record<string, unknown>).title === 'string'
  );
}
