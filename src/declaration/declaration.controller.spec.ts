import { Test, TestingModule } from '@nestjs/testing';
import { DeclarationController } from './declaration.controller';
import { DeclarationService } from './declaration.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('DeclarationController', () => {
  let controller: DeclarationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeclarationController],
      providers: [
        { provide: DeclarationService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeclarationController>(DeclarationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
