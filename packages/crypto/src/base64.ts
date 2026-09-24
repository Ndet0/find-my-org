/**
 * Standard base64 with padding, written out rather than taken from `atob` /
 * `Buffer`: the browser has the first, Bun has both, and Hermes on a phone
 * has neither guaranteed. Keys, nonces and ciphertext cross the wire in this
 * form, so the three runtimes have to agree on it byte for byte.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const LOOKUP = new Map<string, number>()
for (let i = 0; i < ALPHABET.length; i++) {
  LOOKUP.set(ALPHABET[i] as string, i)
}

export function toBase64(bytes: Uint8Array): string {
  let out = ''

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] as number
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)

    out += ALPHABET[(triple >> 18) & 63]
    out += ALPHABET[(triple >> 12) & 63]
    out += b === undefined ? '=' : ALPHABET[(triple >> 6) & 63]
    out += c === undefined ? '=' : ALPHABET[triple & 63]
  }

  return out
}

/** Strict: the length, the alphabet and the padding all have to be right. */
export function fromBase64(text: string): Uint8Array {
  if (!isBase64(text)) {
    throw new Error('Not base64')
  }

  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0
  const bytes = new Uint8Array((text.length / 4) * 3 - padding)
  let offset = 0

  for (let i = 0; i < text.length; i += 4) {
    const a = LOOKUP.get(text[i] as string) ?? 0
    const b = LOOKUP.get(text[i + 1] as string) ?? 0
    const c = LOOKUP.get(text[i + 2] as string) ?? 0
    const d = LOOKUP.get(text[i + 3] as string) ?? 0
    const triple = (a << 18) | (b << 12) | (c << 6) | d

    if (offset < bytes.length) bytes[offset++] = (triple >> 16) & 255
    if (offset < bytes.length) bytes[offset++] = (triple >> 8) & 255
    if (offset < bytes.length) bytes[offset++] = triple & 255
  }

  return bytes
}

export function isBase64(text: string): boolean {
  return text.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(text)
}
