import { Test, TestingModule } from '@nestjs/testing';
import { ChatIaController } from './chat-ia.controller';
import { ChatIaService } from './chat-ia.service';

describe('ChatIaController', () => {
  let controller: ChatIaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatIaController],
      providers: [
        {
          provide: ChatIaService,
          useValue: {
            processMessage: jest.fn(),
            listConversations: jest.fn(),
            getConversation: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatIaController>(ChatIaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
