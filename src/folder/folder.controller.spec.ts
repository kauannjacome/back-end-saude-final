import { Test, TestingModule } from '@nestjs/testing';
import { FolderController } from './folder.controller';
import { FolderService } from './folder.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('FolderController', () => {
  let controller: FolderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FolderController],
      providers: [
        { provide: FolderService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FolderController>(FolderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
