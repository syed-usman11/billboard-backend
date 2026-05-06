import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AddonsService } from './addons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('addons')
export class AddonsController {
  constructor(private addonsService: AddonsService) {}

  @Get()
  async getAllAddons() {
    return this.addonsService.getAllAddons();
  }

  @Get(':id')
  async getAddonById(@Param('id') id: string) {
    return this.addonsService.getAddonById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createAddon(@Body() data: any) {
    return this.addonsService.createAddon(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateAddon(@Param('id') id: string, @Body() data: any) {
    return this.addonsService.updateAddon(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteAddon(@Param('id') id: string) {
    return this.addonsService.deleteAddon(id);
  }
}
