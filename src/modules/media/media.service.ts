import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'multer';
import { PrismaService } from '../../common/prisma/prisma.service';
import { S3Service } from '../../common/s3/s3.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly maxFileSize: number;
  private readonly allowedImageTypes: string[];
  private readonly allowedVideoTypes: string[];
  private readonly maxVideoDuration: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {
    this.maxFileSize = this.configService.get('MAX_FILE_SIZE') || 52428800;
    this.allowedImageTypes = (this.configService.get('ALLOWED_IMAGE_TYPES') || 'jpeg,jpg,png,webp').split(',');
    this.allowedVideoTypes = (this.configService.get('ALLOWED_VIDEO_TYPES') || 'mp4,webm,mov').split(',');
    this.maxVideoDuration = this.configService.get('MAX_VIDEO_DURATION') || 60;
  }

  async uploadMedia(userId: string, file: Express.Multer.File, mediaType: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (mediaType === 'IMAGE') {
      if (!this.allowedImageTypes.includes(fileExtension)) {
        throw new BadRequestException(`Invalid image type. Allowed: ${this.allowedImageTypes.join(', ')}`);
      }
    } else if (mediaType === 'VIDEO') {
      if (!this.allowedVideoTypes.includes(fileExtension)) {
        throw new BadRequestException(`Invalid video type. Allowed: ${this.allowedVideoTypes.join(', ')}`);
      }
    } else {
      throw new BadRequestException('Invalid media type');
    }

    // Upload to S3
    const folder = mediaType === 'IMAGE' ? 'images' : 'videos';
    this.logger.log(`Uploading ${file.originalname} (${file.size} bytes) to S3...`);

    const { url, key } = await this.s3Service.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
    );

    // Save record in database with S3 URL
    const media = await this.prisma.media.create({
      data: {
        userId,
        fileName: file.originalname,
        fileSize: BigInt(file.size),
        type: mediaType,
        url: url,
        publicId: key,
        status: 'UPLOADED',
      },
    });

    this.logger.log(`Media saved: ${media.id} -> ${url}`);
    return media;
  }

  async getMedia(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    return media;
  }

  async getUserMedia(userId: string) {
    return this.prisma.media.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMedia(id: string, userId: string) {
    const media = await this.getMedia(id);

    if (media.userId !== userId) {
      throw new BadRequestException('Cannot delete media of another user');
    }

    const campaigns = await this.prisma.campaign.count({
      where: { mediaId: id },
    });

    if (campaigns > 0) {
      throw new BadRequestException('Cannot delete media that is used in campaigns');
    }

    // Delete from S3 first if it has a key
    if (media.publicId) {
      try {
        await this.s3Service.deleteFile(media.publicId);
      } catch (error) {
        this.logger.error(`Failed to delete S3 file ${media.publicId}: ${error.message}`);
        // Continue with database deletion even if S3 fails
      }
    }

    return this.prisma.media.delete({
      where: { id },
    });
  }

  async approveMedia(id: string) {
    return this.prisma.media.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  async rejectMedia(id: string, reason: string) {
    return this.prisma.media.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }
}
