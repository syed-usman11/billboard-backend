import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { S3Module } from './common/s3/s3.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MediaModule } from './modules/media/media.module';
import { PlansModule } from './modules/plans/plans.module';
import { AddonsModule } from './modules/addons/addons.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SlotsModule } from './modules/slots/slots.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    S3Module,
    AuthModule,
    UsersModule,
    MediaModule,
    PlansModule,
    AddonsModule,
    CampaignsModule,
    SlotsModule,
    PaymentsModule,
    SchedulesModule,
    AdminModule,
    NotificationsModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
