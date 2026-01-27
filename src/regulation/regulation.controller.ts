import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express'; // ✅ import type
import { RegulationService } from './regulation.service';
import { CreateRegulationDto } from './dto/create-regulation.dto';
import { UpdateRegulationDto } from './dto/update-regulation.dto';
import { UpdateStatusRegulationDto } from './dto/update-status-regulation.dto';
import { SearchRegulationDto } from './dto/search-regulation.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../upload/upload.service';
import {
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

@UseGuards(AuthTokenGuard)
@Controller('regulation')
export class RegulationController {
  constructor(
    private readonly regulationService: RegulationService,
    private readonly uploadService: UploadService
  ) { }



  @Post('/upload/:regulationId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRequirement(
    @UploadedFile() file: Express.Multer.File,
    @Param('regulationId') regulationId: string,
    @TokenPayloadParam() token: PayloadTokenDto,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado.');
    }

    return this.uploadService.uploadRequirement(
      file,
      Number(token.sub_id),       // assiannte
      Number(regulationId),       // regulationId
    );
  }

  @Post()
  create(@Body() createRegulationDto: CreateRegulationDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.create(createRegulationDto, Number(TokenPayload.sub_id));
  }

  @Get('deleted/list')
  findAllDeleted(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.findAllDeleted(Number(TokenPayload.sub_id));
  }

  // 🔍 Endpoint de busca
  @Get('search')
  search(@Query() filters: SearchRegulationDto, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.search(Number(TokenPayload.sub_id), filters);
  }

  @Get('by-patient/:patient_id')
  findByPatient(@Param('patient_id') patient_id: string) {
    return this.regulationService.findByPatient(Number(patient_id));
  }


  @Get()
  findAll(@TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.findAll(Number(TokenPayload.sub_id));
  }

  @Get('mobile/person/:uuid')
  findOnePublicPerson(@Param('uuid') uuid: string) {
    return this.regulationService.findOnePublicPerson(uuid);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.findOne(+id, Number(TokenPayload.sub_id));
  }

  @Get('pdf/:id')
  async generatePdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.regulationService.generatePdf(Number(id));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="regulamento_${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }


  @Patch('status/:id')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusRegulationDto,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.regulationService.updateStatus(+id, updateStatusDto.status, Number(TokenPayload.sub_id), updateStatusDto.sendMessage);
  }


  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRegulationDto: UpdateRegulationDto,
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
  ) {
    return this.regulationService.update(+id, updateRegulationDto, Number(TokenPayload.sub_id));
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.restore(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    return this.regulationService.remove(+id, Number(TokenPayload.sub_id));
  }

  @Delete(':id/hard')
  hardDelete(@Param('id') id: string, @TokenPayloadParam() TokenPayload: PayloadTokenDto) {
    if (TokenPayload.role !== 'admin_manager') {
      throw new ForbiddenException('Apenas admin_manager pode remover itens permanentemente.');
    }
    return this.regulationService.hardDelete(+id, Number(TokenPayload.sub_id));
  }
}
