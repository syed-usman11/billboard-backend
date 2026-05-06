import { Controller, Get, Post, Param, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('schedules')
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getUserSchedules(@CurrentUser('id') userId: string) {
    return this.schedulesService.getUserSchedules(userId);
  }

  @Get('today')
  async getTodaySchedule() {
    return this.schedulesService.getTodaySchedule();
  }

  @Get('by-date')
  async getScheduleByDate(@Query('date') date: string) {
    return this.schedulesService.getScheduleByDate(new Date(date));
  }

  @Get('approved-campaigns')
  async getApprovedCampaigns() {
    return this.schedulesService.getApprovedCampaigns();
  }

  @Get('nova-lct')
  async getScheduleForNoveLCT(@Query('date') date?: string) {
    return this.schedulesService.getScheduleForNoveLCT(date ? new Date(date) : undefined);
  }

  @Get('export/json')
  async exportAsJSON(@Query('date') date?: string) {
    return this.schedulesService.exportScheduleAsJSON(date ? new Date(date) : undefined);
  }

  @Get('export/csv')
  async exportAsCSV(
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const csv = await this.schedulesService.exportScheduleAsCSV(date ? new Date(date) : undefined);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="schedule.csv"');
    res.send(csv);
  }

  @Post('campaign/:campaignId/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async generateSchedule(@Param('campaignId') campaignId: string) {
    return this.schedulesService.generateScheduleForCampaign(campaignId);
  }

  @Post('campaign/:campaignId/regenerate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async regenerateSchedule(@Param('campaignId') campaignId: string) {
    return this.schedulesService.regenerateSchedule(campaignId);
  }

  @Post(':scheduleId/running')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async markAsRunning(@Param('scheduleId') scheduleId: string) {
    return this.schedulesService.markScheduleAsRunning(scheduleId);
  }

  @Post(':scheduleId/completed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async markAsCompleted(@Param('scheduleId') scheduleId: string) {
    return this.schedulesService.markScheduleAsCompleted(scheduleId);
  }
}
