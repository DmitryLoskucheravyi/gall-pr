import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { UploadsService } from './uploads.service';

import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({ destination: './temp' }),
    }),
  )
  uploadImage(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    console.log('FILE:', file);

    return this.uploadsService.uploadImage(file);
  }
}
