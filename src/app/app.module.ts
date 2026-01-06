import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CareModule } from '../care/care.module';
import { DeclarationModule } from '../declaration/declaration.module';
import { FolderModule } from '../folder/folder.module';
import { GroupModule } from '../group/group.module';
import { PatientModule } from '../patient/patient.module';
import { ProfessionalModule } from '../professional/professional.module';
import { RegulationModule } from '../regulation/regulation.module';
import { ReportModule } from '../report/report.module';
import { SeedsModule } from '../seeds/seeds.module';
import { SubscriberModule } from '../subscriber/subscriber.module';
import { SupplierModule } from '../supplier/supplier.module';
import { UnitModule } from '../unit/unit.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AuditLogModule,
    CareModule,
    DeclarationModule,
    FolderModule,
    GroupModule,
    PatientModule,
    ProfessionalModule,
    RegulationModule,
    ReportModule,
    SeedsModule,
    SubscriberModule,
    SupplierModule,
    UnitModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
