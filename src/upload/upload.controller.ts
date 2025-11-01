import {
  Controller,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CreateUploadDto, TipoArquivo } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  /**
   * Rota para upload genérico de arquivos.
   * Exemplo: POST /upload
   * Campo esperado no form-data: "file"
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Nenhum arquivo foi enviado.');
    }

    console.log('Arquivo recebido:', file.originalname);
    return await this.uploadService.uploadFile(file, 'arquivos-upload');
  }

  /**
   * Rota para upload de imagem associada a um ID específico.
   * Exemplo: POST /upload/imagem/:id
   * Campos esperados no form-data: "file", e opcionalmente "tipo" no corpo.
   */
  @Post('/imagem')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateUploadDto,
  ) {
    if (!file) {
      throw new Error('Nenhum arquivo foi enviado.');
    }

    const tipo = body.tipo || TipoArquivo.ESTADUAL;
    const idNum = Number(body.id);

    if (isNaN(idNum)) {
      throw new Error('O parâmetro "id" deve ser um número válido.');
    }

    console.log('Arquivo recebido:', file.originalname);
    console.log('Tipo recebido:', tipo);
    console.log('ID recebido:', idNum);

    return await this.uploadService.uploadImage(file, tipo, idNum);
  }
}
