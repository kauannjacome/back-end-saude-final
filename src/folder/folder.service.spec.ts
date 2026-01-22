import { Test, TestingModule } from '@nestjs/testing';
import { FolderService } from './folder.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('FolderService', () => {
  let service: FolderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolderService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<FolderService>(FolderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
