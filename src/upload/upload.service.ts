import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    this.bucketName = process.env.AWS_BUCKET_NAME as string;
    if (!this.bucketName) {
      throw new Error('AWS_BUCKET_NAME não está definido nas variáveis de ambiente!');
    }
  }

  async uploadFile(file: Express.Multer.File) {
    try {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const key = `uploads/${randomUUID()}${fileExt}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

      return {
        message: 'Upload realizado com sucesso!',
        key,
        url,
      };
    } catch (error) {
      console.error('Erro no upload:', error);
      throw new HttpException('Erro ao enviar arquivo para o S3', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
