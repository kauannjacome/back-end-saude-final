import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatIaController } from './chat-ia.controller';
import { ChatIaService } from './chat-ia.service';
import { OrchestratorAgent } from './agents/orchestrator.agent';
import { RouterAgent } from './agents/router.agent';
import { PatientAgent } from './agents/patient.agent';
import { RegulationAgent } from './agents/regulation.agent';
import { InfoAgent } from './agents/info.agent';
import { ValidatorAgent } from './agents/validator.agent';
import { FormatterAgent } from './agents/formatter.agent';
import { OpenAIProvider } from './llm/openai.provider';


@Module({
  imports: [ConfigModule],
  controllers: [ChatIaController],
  providers: [
    ChatIaService,
    OrchestratorAgent,
    RouterAgent,
    PatientAgent,
    RegulationAgent,
    InfoAgent,
    ValidatorAgent,
    FormatterAgent,
    OpenAIProvider,
  ],
  exports: [ChatIaService],
})
export class ChatIaModule { }
