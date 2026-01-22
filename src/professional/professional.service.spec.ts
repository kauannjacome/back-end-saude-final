import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalService } from './professional.service';
import { ConfigService } from '@nestjs/config';
import { HashingServiceProtocol } from '../auth/hash/hashing.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ProfessionalService', () => {
  let service: ProfessionalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalService,
        { provide: PrismaService, useValue: {} },
        { provide: HashingServiceProtocol, useValue: { hash: jest.fn(), compare: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProfessionalService>(ProfessionalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
