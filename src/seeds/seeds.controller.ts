import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, Logger, UploadedFile, ParseFilePipeBuilder, HttpStatus } from '@nestjs/common';
import { SeedsService } from './seeds.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateSeedPatientDto } from './dto/create-seed-patient.dto';

@Controller('seeds')
export class SeedsController {
  constructor(private readonly seedsService: SeedsService) {}

 private readonly logger = new Logger(SeedsController.name);


  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @Post('/person')
  csvPerson(
    @Body() CreateSeedPatient: CreateSeedPatientDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: 'text/csv' })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    this.logger.log(
      `Recebido upload CSV — payload=${JSON.stringify(
        CreateSeedPatient,
      )} file=${file.originalname}`,
    );

    return this.seedsService.csvPerson(CreateSeedPatient, file);
  }
}
