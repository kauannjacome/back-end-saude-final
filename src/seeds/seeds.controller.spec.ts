import { Test, TestingModule } from '@nestjs/testing';
import { SeedsController } from './seeds.controller';
import { SeedsService } from './seeds.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('SeedsController', () => {
  let controller: SeedsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedsController],
      providers: [
        { provide: SeedsService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SeedsController>(SeedsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
