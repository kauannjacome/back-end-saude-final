import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { TipoArquivo } from './dto/create-upload.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly imageBucket: string;  // bucket de imagens
  private readonly region: string;
  constructor(private readonly prisma: PrismaService) {
    // 🔍 Logs de inicialização
    console.log('🟢 Iniciando UploadService...');
    console.log('🔧 Lendo variáveis de ambiente:');
    console.log('  AWS_REGION:', process.env.AWS_REGION);
    console.log('  S3_BUCKET:', process.env.S3_BUCKET);
    console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '[OK]' : '[FALTANDO]');
    console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '[OK]' : '[FALTANDO]');

    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.S3_BUCKET as string;
    this.imageBucket = process.env.IMAGE_BUCKET as string;
    if (!this.bucketName) {
      throw new Error('❌ S3_BUCKET não está definido nas variáveis de ambiente!');
    }

    if (!this.imageBucket) {
      throw new Error('❌ IMAGE_BUCKET não está definido no .env');
    }
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('❌ Credenciais AWS não configuradas corretamente no .env');
    }

    // ✅ Configuração com endpoint regional forçado
    const endpoint = `https://s3.${this.region}.amazonaws.com`;

    this.s3Client = new S3Client({
      region: this.region,
      endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    console.log('✅ S3 Client configurado com sucesso:');
    console.log('  Região:', this.region);
    console.log('  Bucket:', this.bucketName);
    console.log('  Bucket imagem:', this.imageBucket);
    console.log('  Endpoint:', endpoint);
  }

  /**
   * Upload genérico de arquivo para o S3
   */
  async uploadFile(file: Express.Multer.File, folder: string) {
    console.log('📤 Iniciando upload genérico...');
    console.log('  Nome original:', file.originalname);
    console.log('  Pasta destino:', folder);

    try {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const key = `${folder}/${randomUUID()}${fileExt}`;

      console.log('🗝️  Key gerada:', key);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      console.log('✅ Upload concluído com sucesso!');
      console.log('  URL:', url);

      return {
        message: 'Upload realizado com sucesso!',
        key,
        url,
      };
    } catch (error) {
      console.error('❌ Erro detalhado no upload para o S3:');
      console.error('  Código:', error?.Code || error?.name);
      console.error('  Mensagem:', error?.message);
      console.error('  Endpoint:', error?.Endpoint);
      console.error('  Região retornada:', error?.$response?.headers?.['x-amz-bucket-region']);
      console.error('  Stack:', error?.stack);

      throw new InternalServerErrorException(
        'Falha ao enviar o arquivo para o S3. Tente novamente mais tarde.',
      );
    }
  }

async uploadRequirement(
  file: Express.Multer.File,
  userId: number,
  regulationId: number,
) {
  const regulation = await this.prisma.regulation.findUnique({
    where: { id: regulationId },
  });

  if (!regulation) {
    throw new NotFoundException('Regulação não encontrada.');
  }

  const fileExt = path.extname(file.originalname).toLowerCase();
  const key = `users/${userId}/regulations/${regulationId}/requirements/${randomUUID()}${fileExt}`;

  await this.s3Client.send(
    new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  await this.prisma.regulation.update({
    where: { id: regulationId },
    data: {
      url_requirement: key,
      history: { increment: 1 },
    },
  });

  return {
    message: 'Upload realizado com sucesso',
    key,
  };
}



  /**
   * Upload de imagem e atualização do subscriber
   */
async uploadImage(file: Express.Multer.File, tipo: TipoArquivo, id: number) {
  console.log('🖼️ Iniciando upload de imagem...');

  try {
    if (!file) throw new Error('Nenhum arquivo pending.');

    const subscriber = await this.prisma.subscriber.findUnique({ where: { id } });
    if (!subscriber) throw new NotFoundException(`Assinante #${id} não encontrado.`);

    const fileExt = path.extname(file.originalname).toLowerCase();
    const key = `imagens/${id}/${tipo}-${randomUUID()}${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: this.imageBucket,  // ← USA O BUCKET DE IMAGENS
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    const fileUrl = `https://${this.imageBucket}.s3.${this.region}.amazonaws.com/${key}`;

    let updateData: Record<string, any> = {};
    switch (tipo.toLowerCase()) {
      case TipoArquivo.ESTADUAL.toLowerCase():
        updateData.state_logo = fileUrl;
        break;
      case TipoArquivo.MUNICIPAL.toLowerCase():
        updateData.municipal_logo = fileUrl;
        break;
      case TipoArquivo.ADMINISTRATION.toLowerCase():
        updateData.administration_logo = fileUrl;
        break;
    }

    return await this.prisma.subscriber.update({
      where: { id },
      data: updateData,
    });

  } catch (error) {
    console.error('❌ Erro no uploadImage:', error);
    throw new InternalServerErrorException('Erro ao enviar imagem.');
  }
}

  /**
   * Gera URL de download temporária (assinada)
   */
  async getDownloadUrl(key: string) {
    console.log('🔗 Gerando URL de download para:', key);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      console.log('✅ URL de download gerada com sucesso!');
      console.log('  URL:', signedUrl);

      return { downloadUrl: signedUrl };
    } catch (error) {
      console.error('❌ Erro ao gerar URL de download:');
      console.error('  Código:', error?.Code || error?.name);
      console.error('  Mensagem:', error?.message);
      console.error('  Stack:', error?.stack);

      throw new InternalServerErrorException('Erro ao gerar link de download.');
    }
  }



  async getDocumentUrl(type: string, id: number) {
    console.log('🔗 Gerando URL de download para tipo:', type, 'ID:', id);

    try {
      // Busca o registro da regulação pelo ID
      const regulation = await this.prisma.regulation.findUnique({
        where: { id: Number(id) },
        select: {
          url_requirement: true,
          url_pre_document: true,
          url_current_document: true,
        },
      });

      if (!regulation) {
        throw new NotFoundException('Regulação não encontrada.');
      }

      // Define a key conforme o tipo informado
      let key: string | null | undefined;


      if (type === 'requirement') {
        key = regulation.url_requirement;
      } else if (type === 'pre') {
        key = regulation.url_pre_document;
      } else if (type === 'current') {
        key = regulation.url_current_document;
      } else {
        throw new BadRequestException('Tipo inválido. Use requirement, pre ou current.');
      }

      if (!key) {
        throw new NotFoundException(`Nenhuma chave de arquivo encontrada para o tipo "${type}".`);
      }

      // Gera o link assinado do S3
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      console.log('✅ URL de download gerada com sucesso!');
      console.log('  URL:', signedUrl);

      return { downloadUrl: signedUrl };
    } catch (error) {
      console.error('❌ Erro ao gerar URL de download:');
      console.error('  Código:', error?.Code || error?.name);
      console.error('  Mensagem:', error?.message);
      console.error('  Stack:', error?.stack);

      throw new InternalServerErrorException('Erro ao gerar link de download.');
    }
  }

}
