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

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
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
    DeclarationModule


   ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
