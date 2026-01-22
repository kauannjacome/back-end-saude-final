import { Test, TestingModule } from '@nestjs/testing';
import { CareService } from './care.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CareService', () => {
  let service: CareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<CareService>(CareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
