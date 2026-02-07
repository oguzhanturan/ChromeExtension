import { SharePayload, COLOR_LIST } from '../types/tab-group';

const SHARE_PREFIX = 'tgs:';

// V2 compact format: {v:2, n:"name", c:0-8, t:["url1","url2"]}
interface CompactPayloadV2 {
  v: 2;
  n: string;
  c: number;
  t: string[];
}

// V1 format: {version:1, name:"", color:"blue", tabs:[{url,title}]}
interface RawPayloadV1 {
  version: 1;
  name: string;
  color: string;
  tabs: { url: string; title: string }[];
}

export function encode(payload: SharePayload): string {
  // Always encode to v2 compact format
  const colorIndex = COLOR_LIST.indexOf(payload.color);
  const compact: CompactPayloadV2 = {
    v: 2,
    n: payload.name,
    c: colorIndex >= 0 ? colorIndex : 1, // default to blue
    t: payload.tabs.map((tab) => tab.url),
  };
  const json = JSON.stringify(compact);
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

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Invalid share code: malformed JSON data.');
  }

  // Try v2 first, then v1
  if (isValidV2(raw)) {
    return normalizeV2(raw);
  }
  if (isValidV1(raw)) {
    return normalizeV1(raw);
  }

  throw new Error('Invalid share code: unexpected data format.');
}

function isValidV2(data: unknown): data is CompactPayloadV2 {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.v === 2 &&
    typeof obj.n === 'string' &&
    typeof obj.c === 'number' &&
    obj.c >= 0 &&
    obj.c < COLOR_LIST.length &&
    Array.isArray(obj.t) &&
    obj.t.every((u) => typeof u === 'string')
  );
}

function isValidV1(data: unknown): data is RawPayloadV1 {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.version === 1 &&
    typeof obj.name === 'string' &&
    typeof obj.color === 'string' &&
    COLOR_LIST.includes(obj.color as chrome.tabGroups.ColorEnum) &&
    Array.isArray(obj.tabs) &&
    obj.tabs.every(
      (tab: unknown) =>
        typeof tab === 'object' &&
        tab !== null &&
        typeof (tab as Record<string, unknown>).url === 'string'
    )
  );
}

function normalizeV2(raw: CompactPayloadV2): SharePayload {
  return {
    version: 2,
    name: raw.n,
    color: COLOR_LIST[raw.c],
    tabs: raw.t.map((url) => ({ url, title: '' })),
  };
}

function normalizeV1(raw: RawPayloadV1): SharePayload {
  return {
    version: 1,
    name: raw.name,
    color: raw.color as chrome.tabGroups.ColorEnum,
    tabs: raw.tabs.map((t) => ({ url: t.url, title: t.title || '' })),
  };
}
