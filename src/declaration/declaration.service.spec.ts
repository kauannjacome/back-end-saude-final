import { Test, TestingModule } from '@nestjs/testing';
import { DeclarationService } from './declaration.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DeclarationService', () => {
  let service: DeclarationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeclarationService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<DeclarationService>(DeclarationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
