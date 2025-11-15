import { Controller, Post, Body, UseInterceptors, Logger, UploadedFile,  BadRequestException } from '@nestjs/common';
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
  @UploadedFile() file: Express.Multer.File,
) {
  if (!file) {
    throw new BadRequestException('Arquivo CSV obrigatório');
  }

  if (!file.originalname.toLowerCase().endsWith('.csv')) {
    throw new BadRequestException('O arquivo deve ser um .csv');
  }

  this.logger.log(
    `Recebido upload CSV — payload=${JSON.stringify(
      CreateSeedPatient,
    )} file=${file.originalname}`,
  );

  return this.seedsService.csvPerson(CreateSeedPatient, file);
}

}
