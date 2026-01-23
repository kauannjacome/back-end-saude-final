import { Test, TestingModule } from '@nestjs/testing';
import { ChatIaService } from './chat-ia.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrchestratorAgent } from './agents/orchestrator.agent';

describe('ChatIaService', () => {
  let service: ChatIaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatIaService,
        {
          provide: PrismaService,
          useValue: {
            chat_conversation: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            chat_message: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: OrchestratorAgent,
          useValue: {
            handle: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatIaService>(ChatIaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
