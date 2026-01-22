import { Test, TestingModule } from '@nestjs/testing';
import { SuggestionService } from './suggestion.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SuggestionService', () => {
  let service: SuggestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SuggestionService>(SuggestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
