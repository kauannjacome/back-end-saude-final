import { Test, TestingModule } from '@nestjs/testing';
import { SubscriberService } from './subscriber.service';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubscriberService', () => {
  let service: SubscriberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriberService,
        { provide: PrismaService, useValue: {} },
        { provide: HashingServiceProtocol, useValue: { hash: jest.fn(), compare: jest.fn() } },
      ],
    }).compile();

    service = module.get<SubscriberService>(SubscriberService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
