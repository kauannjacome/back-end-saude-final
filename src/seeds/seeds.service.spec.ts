import { Test, TestingModule } from '@nestjs/testing';
import { SeedsService } from './seeds.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('SeedsService', () => {
  let service: SeedsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedsService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SeedsService>(SeedsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
