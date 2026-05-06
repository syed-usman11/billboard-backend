import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { extname } from 'path';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION') || 'ap-south-1';
    this.bucket = this.configService.get('AWS_S3_BUCKET') || 'billboard-ads-media-syedusman11';

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Upload a file buffer to S3
   * Returns the public URL of the uploaded file
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'media',
  ): Promise<{ url: string; key: string }> {
    const randomName = randomBytes(16).toString('hex');
    const ext = extname(originalName);
    const key = `${folder}/${randomName}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`Uploaded file to S3: ${key}`);

      return { url, key };
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from S3 by key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete from S3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract S3 key from a full URL
   */
  extractKeyFromUrl(url: string): string | null {
    const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    if (url.startsWith(prefix)) {
      return url.substring(prefix.length);
    }
    return null;
  }
}
