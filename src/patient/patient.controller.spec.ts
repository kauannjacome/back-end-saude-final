import { Test, TestingModule } from '@nestjs/testing';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('PatientController', () => {
  let controller: PatientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [
        { provide: PatientService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PatientController>(PatientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
