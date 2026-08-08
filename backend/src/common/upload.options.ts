import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';

const TEMP_DIR = './temp';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

// Everything uploaded here is a photograph — a painting for the catalogue, or a
// screenshot of a bank transfer. Nothing else has any business being written to
// disk, least of all on a route anonymous callers can reach.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
]);

// Multer writes the file before any handler runs, so the name it lands under is
// attacker-influenced on the guest-reachable route. A random name with a
// whitelisted extension keeps a crafted `originalname` from deciding anything
// about the path on disk.
function safeFilename(originalName: string): string {
  const extension = extname(originalName).toLowerCase();
  const suffix = ALLOWED_EXTENSIONS.has(extension) ? extension : '.bin';

  return `${Date.now()}-${randomBytes(8).toString('hex')}${suffix}`;
}

// Shared by the admin catalogue upload and the customer's payment-proof upload.
//
// The limits matter most on the latter: it sits behind OptionalJwtAuthGuard, so
// anyone at all reaches it, and in NestJS the interceptor runs *after* the guard
// but *before* the handler — meaning the file is already on disk by the time the
// order's owner is checked. Without a ceiling that is an unauthenticated way to
// fill the volume.
export const imageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: TEMP_DIR,
    filename: (_req, file, callback) => {
      callback(null, safeFilename(file.originalname));
    },
  }),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
    // Without this, a multipart body can carry unlimited non-file fields.
    fields: 20,
  },
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();

    if (
      !ALLOWED_MIME_TYPES.has(file.mimetype) ||
      !ALLOWED_EXTENSIONS.has(extension)
    ) {
      callback(
        new BadRequestException(
          'Підтримуються лише зображення: JPG, PNG, WEBP або HEIC',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
};
