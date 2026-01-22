import { Test, TestingModule } from '@nestjs/testing';
import { ZapService } from './service';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';

describe('ZapService', () => {
  let service: ZapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZapService,
        { provide: PrismaService, useValue: {} },
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } },
      ],
    }).compile();

    service = module.get<ZapService>(ZapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
