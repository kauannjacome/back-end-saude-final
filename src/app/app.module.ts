import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CareModule } from '../care/care.module';
import { FolderModule } from '../folder/folder.module';
import { GroupModule } from '../group/group.module';
import { PatientModule } from '../patient/patient.module';
import { ProfessionalModule } from '../professional/professional.module';
import { RegulationModule } from '../regulation/regulation.module';
import { SubscriberModule } from '../subscriber/subscriber.module';
import { SupplierModule } from '../supplier/supplier.module';
import { UnitModule } from '../unit/unit.module';
import { UploadModule } from '../upload/upload.module';
import { ReportModule } from '../report/report.module';
import { DeclarationModule } from '../declaration/declaration.module';
import { SeedsModule } from '../seeds/seeds.module';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envSchema } from '../common/env/env';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { ZapModule } from '../zap/module';
import { SuggestionModule } from '../suggestion/suggestion.module';
import { QueueModule } from '../common/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        const parsed = envSchema.safeParse(env);
        if (parsed.success === false) {
          console.error('❌ Mismatched Environment Variables:', parsed.error.format());
          throw new Error('Invalid environment variables');
        }
        return parsed.data;
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'development'
          ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
            },
          }
          : undefined,
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
    AuditLogModule,
    CareModule,
    FolderModule,
    GroupModule,
    PatientModule,
    ProfessionalModule,
    RegulationModule,
    SubscriberModule,
    SupplierModule,
    UnitModule,
    UploadModule,
    ReportModule,
    DeclarationModule,
    SeedsModule,
    AuthModule,
    HealthModule,
    HealthModule,
    EmailModule,
    NotificationModule,
    ZapModule,
    SuggestionModule,
    QueueModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
