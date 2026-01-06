import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { TipoArquivo } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { getDocumentUrl } from './dto/get-document-url.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload genérico de arquivos
   * Exemplo: POST /upload (campo form-data: "file")
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }
    return await this.uploadService.uploadFile(file, 'certificados');
  }

  @Post('/requirement')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRequirement(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }
    return await this.uploadService.uploadRequirement(file, 1);
  }


  /**
   * Upload de imagem associada a um ID e tipo
   * Exemplo: POST /upload/imagem
   * Campos esperados: "file", "id", "tipo"
   */
  @Post('/imagem')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    const tipo = body.tipo || TipoArquivo.ESTADUAL;
    const idNum = Number(body.id);

    if (isNaN(idNum)) {
      throw new BadRequestException('O parâmetro "id" deve ser um número válido');
    }

    return await this.uploadService.uploadImage(file, tipo, idNum);
  }

  /**
   * Gera uma URL de download temporária (assinada)
   * Exemplo: GET /upload/download-url?key=certificados/teste.pdf
   */
  @Get('download-url')
  async getDownloadUrl(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('O parâmetro "key" é obrigatório');
    }
    return await this.uploadService.getDownloadUrl(key);
  }

  @Get('document')
  async getDocumentUrl(@Query() query: getDocumentUrl) {
    const { type, id } = query;

    if (!type || !id) {
      throw new BadRequestException('Parâmetros "type" e "id" são obrigatórios');
    }

    return this.uploadService.getDocumentUrl(type, id);
  }
}
