import { Test, TestingModule } from '@nestjs/testing';
import { SubscriberController } from './subscriber.controller';
import { SubscriberService } from './subscriber.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('SubscriberController', () => {
  let controller: SubscriberController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriberController],
      providers: [
        { provide: SubscriberService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriberController>(SubscriberController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
