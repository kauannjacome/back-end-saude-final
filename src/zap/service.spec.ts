import { Test, TestingModule } from '@nestjs/testing';
import { ZapService } from './service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppProviderRegistry } from './registry/provider.registry';
import { getQueueToken } from '@nestjs/bull';

describe('ZapService', () => {
  let service: ZapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZapService,
        { provide: PrismaService, useValue: {} },
        {
          provide: WhatsAppProviderRegistry, // Correct class injection
          useValue: {
            getProvider: jest.fn(),
          }
        },
        {
          provide: getQueueToken('whatsapp'),
          useValue: {
            add: jest.fn(),
          }
        },
      ],
    }).compile();

    service = module.get<ZapService>(ZapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
