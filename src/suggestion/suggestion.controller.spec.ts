import { Test, TestingModule } from '@nestjs/testing';
import { SuggestionController } from './suggestion.controller';
import { SuggestionService } from './suggestion.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';

describe('SuggestionController', () => {
  let controller: SuggestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuggestionController],
      providers: [
        { provide: SuggestionService, useValue: {} },
      ],
    })
      .overrideGuard(AuthTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuggestionController>(SuggestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
