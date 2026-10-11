import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from './errorHandler.js';
import { MAX_VOICE_BYTES, normalizeAudioMime } from '../utils/kafelaVoiceStorage.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_VOICE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    try {
      normalizeAudioMime(file.mimetype);
      cb(null, true);
    } catch (err) {
      cb(err instanceof Error ? err : new AppError(400, 'Unsupported audio type'));
    }
  },
}).single('audio');

export const kafelaVoiceUpload: RequestHandler = (req, res, next) => {
  upload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof AppError) return next(err);
    if (err && typeof err === 'object' && 'code' in err) {
      const code = String((err as { code?: string }).code || '');
      if (code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(400, 'Voice message must be under 2MB'));
      }
    }
    const message = err instanceof Error ? err.message : 'Could not upload audio';
    return next(new AppError(400, message));
  });
};
