import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { open, unlink } from 'fs/promises';

// The multer fileFilter can only judge by MIME type and file extension, both
// of which the client writes. This reads what the bytes actually say.
//
// Each entry is a magic number at offset 0, except WEBP and HEIC, which are
// ISO base media containers: bytes 0-3 are a length, and the brand sits at
// offset 4. So the check is "starts with", applied at a stated offset.
const IMAGE_SIGNATURES: Array<{ offset: number; bytes: Buffer }> = [
  { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }, // JPEG
  { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }, // PNG
  { offset: 8, bytes: Buffer.from('WEBP', 'ascii') }, // RIFF....WEBP
  { offset: 4, bytes: Buffer.from('ftyp', 'ascii') }, // HEIC/HEIF
];

const HEADER_BYTES = 16;

async function looksLikeImage(path: string): Promise<boolean> {
  const handle = await open(path, 'r');

  try {
    const header = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(header, 0, HEADER_BYTES, 0);

    return IMAGE_SIGNATURES.some(({ offset, bytes }) => {
      if (bytesRead < offset + bytes.length) return false;

      return header.subarray(offset, offset + bytes.length).equals(bytes);
    });
  } finally {
    await handle.close();
  }
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

      api_key: process.env.CLOUDINARY_API_KEY,

      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(file: Express.Multer.File) {
    try {
      // Checked here rather than in the fileFilter because a filter runs
      // before any bytes are on disk. Cloudinary would reject a non-image
      // anyway, but that is a round-trip to a third party to learn something
      // the first four bytes already said.
      if (!(await looksLikeImage(file.path))) {
        throw new BadRequestException(
          'Файл не є зображенням: JPG, PNG, WEBP або HEIC',
        );
      }

      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'gallery',
        timestamp: Math.round(Date.now() / 1000),
      });

      return { url: result.secure_url };
    } finally {
      unlink(file.path).catch((error) => {
        this.logger.warn(`Failed to remove temp upload ${file.path}`, error);
      });
    }
  }
}
