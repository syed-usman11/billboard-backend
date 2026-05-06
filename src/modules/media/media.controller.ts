import { Controller, Post, Get, Delete, UseGuards, UseInterceptors, UploadedFile, Body, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import 'multer';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
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
