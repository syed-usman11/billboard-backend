import { Controller, Post, Get, Delete, UseGuards, UseInterceptors, UploadedFile, Body, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import 'multer';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const storage = diskStorage({
  destination: './uploads/media',
  filename: (req, file, cb) => {
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') mediaType: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!mediaType) {
      throw new BadRequestException('Media type is required');
    }

    return this.mediaService.uploadMedia(userId, file, mediaType);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMedia(@Param('id') id: string) {
    return this.mediaService.getMedia(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserMedia(@CurrentUser('id') userId: string) {
    return this.mediaService.getUserMedia(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteMedia(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.deleteMedia(id, userId);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveMedia(@Param('id') id: string) {
    return this.mediaService.approveMedia(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectMedia(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.mediaService.rejectMedia(id, body.reason);
  }
}
