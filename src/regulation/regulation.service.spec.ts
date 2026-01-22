import { Test, TestingModule } from '@nestjs/testing';
import { RegulationService } from './regulation.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from '../common/queue/queue.service';
import { ZapService } from '../zap/service';

describe('RegulationService', () => {
  let service: RegulationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegulationService,
        { provide: PrismaService, useValue: {} },
        { provide: ZapService, useValue: {} },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
      ],
    }).compile();

    service = module.get<RegulationService>(RegulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
