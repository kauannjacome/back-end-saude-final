import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalController } from './professional.controller';
import { ProfessionalService } from './professional.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('ProfessionalController', () => {
  let controller: ProfessionalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionalController],
      providers: [
        { provide: ProfessionalService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfessionalController>(ProfessionalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
