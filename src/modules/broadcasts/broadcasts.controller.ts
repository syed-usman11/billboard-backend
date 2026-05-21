import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('broadcasts')
@UseGuards(JwtAuthGuard)
export class BroadcastsController {
  constructor(private broadcastsService: BroadcastsService) {}

  // ── User routes (static paths first to avoid :id collision) ──────────────
  @Get('my/list')
  getMyBroadcasts(@Request() req: any) {
    return this.broadcastsService.getMyBroadcasts(req.user.id);
  }

  @Get('my/unread-count')
  getUnreadCount(@Request() req: any) {
    return this.broadcastsService.getUnreadCount(req.user.id);
  }

  @Patch('my/read-all')
  markAllAsRead(@Request() req: any) {
    return this.broadcastsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.broadcastsService.markAsRead(id, req.user.id);
  }

  // ── Book an offer ────────────────────────────────────────────────────────
  @Post(':id/book')
  bookOffer(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.broadcastsService.bookOffer(req.user.id, id, data);
  }

  // ── Admin routes ─────────────────────────────────────────────────────────
  @Post('check-plan-name')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  checkPlanName(@Body() data: { name: string }) {
    return this.broadcastsService.checkPlanName(data.name);
  }

  @Patch(':id/limit')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateLimit(@Param('id') id: string, @Body() data: { bookingLimitPerUser: number | null }) {
    return this.broadcastsService.updateLimit(id, data.bookingLimitPerUser);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() data: any) {
    return this.broadcastsService.createBroadcast(data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getAll() {
    return this.broadcastsService.getAllBroadcasts();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getOne(@Param('id') id: string) {
    return this.broadcastsService.getBroadcastById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.broadcastsService.updateBroadcast(id, data);
  }

  @Post(':id/send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  send(@Param('id') id: string) {
    return this.broadcastsService.sendBroadcast(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.broadcastsService.deleteBroadcast(id);
  }
}
