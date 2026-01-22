import { Test, TestingModule } from '@nestjs/testing';
import { ZapController } from './controller';
import { ZapService } from './service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('ZapController', () => {
  let controller: ZapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZapController],
      providers: [
        { provide: ZapService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ZapController>(ZapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
