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

// --- Compression helpers (browser built-in, no dependencies) ---

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(new Uint8Array(data));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(new Uint8Array(data));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// --- Public API ---

export async function encode(payload: SharePayload): Promise<string> {
  const colorIndex = COLOR_LIST.indexOf(payload.color);
  const compact: CompactPayloadV2 = {
    v: 2,
    n: payload.name,
    c: colorIndex >= 0 ? colorIndex : 1,
    t: payload.tabs.map((tab) => tab.url),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  const compressed = await compress(bytes);
  return SHARE_PREFIX + toBase64(compressed);
}

export async function decode(shareCode: string): Promise<SharePayload> {
  const trimmed = shareCode.trim();

  if (!trimmed.startsWith(SHARE_PREFIX)) {
    throw new Error('Invalid share code: missing "tgs:" prefix.');
  }

  const b64 = trimmed.slice(SHARE_PREFIX.length);
  let bytes: Uint8Array;
  try {
    bytes = fromBase64(b64);
  } catch {
    throw new Error('Invalid share code: could not decode base64 data.');
  }

  // Try decompressed first (v3), fall back to raw (v1/v2)
  let json: string;
  try {
    const decompressed = await decompress(bytes);
    json = new TextDecoder().decode(decompressed);
  } catch {
    json = new TextDecoder().decode(bytes);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Invalid share code: malformed data.');
  }

  if (isValidV2(raw)) return normalizeV2(raw);
  if (isValidV1(raw)) return normalizeV1(raw);

  throw new Error('Invalid share code: unexpected data format.');
}

// --- Validators ---

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

// --- Normalizers ---

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
