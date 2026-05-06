import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createCampaign(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignsService.createCampaign(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getUserCampaigns(@CurrentUser('id') userId: string) {
    return this.campaignsService.getUserCampaigns(userId);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getCampaignsByStatus(@Param('status') status: string) {
    return this.campaignsService.getCampaignsByStatus(status);
  }

  @Get('pending-approvals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPendingApprovals() {
    return this.campaignsService.getPendingApprovals();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateCampaign(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.updateCampaign(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCampaign(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.deleteCampaign(id, userId);
  }

  @Post(':id/submit-approval')
  @UseGuards(JwtAuthGuard)
  async submitForApproval(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignsService.submitForApproval(id, userId);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveCampaign(@Param('id') id: string) {
    return this.campaignsService.approveCampaign(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectCampaign(
    @Param('id') id: string,
    @Body() body: { rejectionReason: string },
  ) {
    return this.campaignsService.rejectCampaign(id, body.rejectionReason);
  }
}
