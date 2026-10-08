const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChunk(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Human-friendly join code, e.g. HB-7K4M */
export function generateJoinCode(): string {
  return `HB-${randomChunk(4)}`;
}

export function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}
