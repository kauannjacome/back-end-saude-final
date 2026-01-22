import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalPublicController } from './professional.public.controller';
import { ProfessionalService } from './professional.service';

describe('ProfessionalPublicController', () => {
  let controller: ProfessionalPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionalPublicController],
      providers: [
        { provide: ProfessionalService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ProfessionalPublicController>(ProfessionalPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
