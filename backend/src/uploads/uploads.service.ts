import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { unlink } from 'fs/promises';

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
