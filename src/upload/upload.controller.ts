import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { TipoArquivo } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';

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
    if (!file) throw new Error('Nenhum arquivo foi enviado.');

    console.log('Arquivo recebido:', file.originalname);
    return await this.uploadService.uploadFile(file, 'certificados');
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
    if (!file) throw new Error('Nenhum arquivo foi enviado.');

    const tipo = body.tipo || TipoArquivo.ESTADUAL;
    const idNum = Number(body.id);

    if (isNaN(idNum)) throw new Error('O parâmetro "id" deve ser um número válido.');

    console.log('Arquivo recebido:', file.originalname);
    console.log('Tipo recebido:', tipo);
    console.log('ID recebido:', idNum);

    return await this.uploadService.uploadImage(file, tipo, idNum);
  }

  /**
   * Gera uma URL de download temporária (assinada)
   * Exemplo: GET /upload/download-url?key=certificados/teste.pdf
   */
  @Get('download-url')
  async getDownloadUrl(@Query('key') key: string) {
    if (!key) throw new Error('O parâmetro "key" é obrigatório.');
    return await this.uploadService.getDownloadUrl(key);
  }
}
