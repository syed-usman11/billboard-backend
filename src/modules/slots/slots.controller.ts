import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('slots')
export class SlotsController {
  constructor(private slotsService: SlotsService) {}

  @Get('available')
  async getAvailableSlots(
    @Query('date') date: string,
    @Query('periodType') periodType?: string,
  ) {
    return this.slotsService.getAvailableSlots(new Date(date), periodType);
  }

  @Get(':id')
  async getSlotById(@Param('id') id: string) {
    return this.slotsService.getSlotById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createSlot(@Body() data: any) {
    return this.slotsService.createSlot(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateSlot(@Param('id') id: string, @Body() data: any) {
    return this.slotsService.updateSlot(id, data);
  }

  @Post(':id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async blockSlot(@Param('id') id: string) {
    return this.slotsService.blockSlot(id);
  }

  @Post(':id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async unblockSlot(@Param('id') id: string) {
    return this.slotsService.unblockSlot(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteSlot(@Param('id') id: string) {
    return this.slotsService.deleteSlot(id);
  }

  @Post('generate-range')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async generateSlotsForRange(
    @Body() data: { startDate: string; endDate: string; slotDuration?: number },
  ) {
    return this.slotsService.generateSlotsForDateRange(
      new Date(data.startDate),
      new Date(data.endDate),
      data.slotDuration || 10,
    );
  }
}
