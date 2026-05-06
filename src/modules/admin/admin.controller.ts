import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('slot-occupancy')
  async getSlotOccupancy(@Query('date') date: string) {
    return this.adminService.getSlotOccupancy(new Date(date));
  }

  @Get('today-schedule')
  async getTodaySchedule() {
    return this.adminService.getTodaySchedule();
  }

  @Get('payments')
  async getAllPayments() {
    return this.adminService.getAllPayments();
  }

  @Get('campaigns')
  async getAllCampaigns() {
    return this.adminService.getAllCampaigns();
  }

  @Get('audit-logs')
  async getAuditLogs(@Query('limit') limit: string = '100') {
    return this.adminService.getAuditLogs(parseInt(limit, 10));
  }
}
