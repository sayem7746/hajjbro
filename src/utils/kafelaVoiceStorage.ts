import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

export const VOICE_BODY = 'Voice message';
export const MAX_VOICE_BYTES = 2 * 1024 * 1024;
export const MAX_VOICE_DURATION_MS = 60_000;

const ALLOWED_MIME = new Set(['audio/mp4', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/webm']);

const EXT_BY_MIME: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/webm': 'webm',
};

function uploadsRoot(): string {
  return path.resolve(process.cwd(), 'uploads', 'kafela-voice');
}

export function normalizeAudioMime(raw: string | undefined | null): string {
  const mime = (raw || '').split(';')[0].trim().toLowerCase();
  if (!mime) throw new AppError(400, 'Audio file is required');
  if (!ALLOWED_MIME.has(mime)) throw new AppError(400, 'Unsupported audio type');
  return mime;
}

export function formatVoicePushBody(durationMs: number | null | undefined): string {
  if (durationMs == null || durationMs < 0) return VOICE_BODY;
  const totalSec = Math.max(0, Math.round(durationMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${VOICE_BODY} · ${m}:${String(s).padStart(2, '0')}`;
}

export async function ensureVoiceUploadDir(): Promise<string> {
  const dir = uploadsRoot();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveVoiceFile(
  buffer: Buffer,
  mime: string
): Promise<{ audioPath: string; audioMime: string }> {
  if (!buffer?.length) throw new AppError(400, 'Audio file is required');
  if (buffer.length > MAX_VOICE_BYTES) {
    throw new AppError(400, 'Voice message must be under 2MB');
  }
  const audioMime = normalizeAudioMime(mime);
  const ext = EXT_BY_MIME[audioMime] || EXT_BY_MIME[mime.toLowerCase()] || 'm4a';
  const dir = await ensureVoiceUploadDir();
  const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
  const absolute = path.join(dir, filename);
  await writeFile(absolute, buffer);
  return {
    audioPath: path.posix.join('kafela-voice', filename),
    audioMime,
  };
}

export function resolveVoiceAbsolutePath(audioPath: string): string {
  if (!audioPath || audioPath.includes('..') || path.isAbsolute(audioPath)) {
    throw new AppError(400, 'Invalid audio path');
  }
  const root = uploadsRoot();
  const absolute = path.resolve(process.cwd(), 'uploads', audioPath);
  if (!absolute.startsWith(root)) {
    throw new AppError(400, 'Invalid audio path');
  }
  return absolute;
}

export async function deleteVoiceFile(audioPath: string | null | undefined): Promise<void> {
  if (!audioPath) return;
  try {
    const absolute = resolveVoiceAbsolutePath(audioPath);
    if (existsSync(absolute)) await unlink(absolute);
  } catch {
    // best-effort cleanup
  }
}

export function openVoiceReadStream(audioPath: string) {
  const absolute = resolveVoiceAbsolutePath(audioPath);
  if (!existsSync(absolute)) throw new AppError(404, 'Audio file not found');
  return createReadStream(absolute);
}
