import { Controller, Post, Body, UseInterceptors, Logger, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { SeedsService } from './seeds.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateSeedPatientDto } from './dto/create-seed-patient.dto';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';
import { PayloadTokenDto } from '../auth/dto/payload-token.dto';

@UseGuards(AuthTokenGuard)
@Controller('seeds')
export class SeedsController {
  constructor(private readonly seedsService: SeedsService) { }

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
    @TokenPayloadParam() TokenPayload: PayloadTokenDto
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
    CreateSeedPatient.subscriber_id = Number(TokenPayload.sub_id)

    return this.seedsService.csvPerson(CreateSeedPatient, file);
  }

}
