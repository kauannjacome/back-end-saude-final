import { Test, TestingModule } from '@nestjs/testing';
import { RegulationController } from './regulation.controller';
import { RegulationService } from './regulation.service';
import { UploadService } from '../upload/upload.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('RegulationController', () => {
  let controller: RegulationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegulationController],
      providers: [
        { provide: RegulationService, useValue: {} },
        { provide: UploadService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RegulationController>(RegulationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
