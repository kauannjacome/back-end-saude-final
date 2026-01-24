import { Test, TestingModule } from '@nestjs/testing';
import { ZapService } from './service';
import { PrismaService } from '../prisma/prisma.service';

describe('ZapService', () => {
  let service: ZapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZapService,
        { provide: PrismaService, useValue: {} },
        {
          provide: 'WHATSAPP_PROVIDER',
          useValue: {
            checkStatus: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
            sendMessage: jest.fn(),
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
