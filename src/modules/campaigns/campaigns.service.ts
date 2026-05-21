import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async createCampaign(userId: string, dto: CreateCampaignDto) {
    const media = await this.prisma.media.findUnique({
      where: { id: dto.mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.userId !== userId) {
      throw new BadRequestException('Media does not belong to you');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    let totalAmount = plan.price;

    if (dto.addonIds && dto.addonIds.length > 0) {
      const addons = await this.prisma.addon.findMany({
        where: { id: { in: dto.addonIds } },
      });

      totalAmount += addons.reduce((sum, addon) => sum + addon.price, 0);
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        mediaId: dto.mediaId,
        planId: dto.planId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalAmount,
        status: 'PENDING_APPROVAL',
      },
    });

    if (dto.addonIds && dto.addonIds.length > 0) {
      await this.prisma.campaignAddon.createMany({
        data: dto.addonIds.map((addonId) => ({
          campaignId: campaign.id,
          addonId,
        })),
      });
    }

    return campaign;
  }

  async getCampaignById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        media: true,
        plan: true,
        payment: true,
        appliedAddons: {
          include: { addon: true },
        },
        bookings: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async getUserCampaigns(userId: string) {
    return this.prisma.campaign.findMany({
      where: { userId },
      include: {
        media: true,
        plan: true,
        payment: true,
        appliedAddons: {
          include: { addon: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCampaign(id: string, userId: string, dto: UpdateCampaignDto) {
    const campaign = await this.getCampaignById(id);

    if (campaign.userId !== userId) {
      throw new BadRequestException('Cannot update campaign of another user');
    }

    if (!['DRAFT', 'PENDING_APPROVAL'].includes(campaign.status)) {
      throw new BadRequestException('Can only update campaigns pending approval');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCampaign(id: string, userId: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.userId !== userId) {
      throw new BadRequestException('Cannot delete campaign of another user');
    }

    if (!['DRAFT', 'PENDING_APPROVAL'].includes(campaign.status)) {
      throw new BadRequestException('Can only delete campaigns pending approval');
    }

    return this.prisma.campaign.delete({
      where: { id },
    });
  }

  async submitForApproval(id: string, userId: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.userId !== userId) {
      throw new BadRequestException('Cannot submit campaign of another user');
    }

    if (!['DRAFT', 'PENDING_APPROVAL'].includes(campaign.status)) {
      throw new BadRequestException('Campaign cannot be submitted in its current status');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  async resubmitAfterRejection(id: string, userId: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.userId !== userId) {
      throw new BadRequestException('Cannot resubmit campaign of another user');
    }

    if (campaign.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected campaigns can be resubmitted');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL', rejectionReason: null },
    });
  }

  async approveCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Campaign must be in PENDING_APPROVAL status');
    }

    const approved = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: { plan: true },
    });

    // Auto-generate one schedule entry per day for the campaign period
    await this.prisma.schedule.deleteMany({ where: { campaignId: id } });
    const entries: any[] = [];
    const current = new Date(approved.startDate);
    const end = new Date(approved.endDate);
    while (current <= end) {
      entries.push({
        campaignId: id,
        mediaId: approved.mediaId,
        date: new Date(current),
        startTime: '09:00',
        endTime: '21:00',
        playCount: approved.plan?.playsPerDay ?? 10,
        status: 'PENDING',
      });
      current.setDate(current.getDate() + 1);
    }
    if (entries.length > 0) {
      await this.prisma.schedule.createMany({ data: entries });
    }

    return approved;
  }

  async rejectCampaign(id: string, rejectionReason: string) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
      },
    });
  }

  async getCampaignsByStatus(status: string) {
    return this.prisma.campaign.findMany({
      where: { status: status as any },
      include: {
        user: true,
        media: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingApprovals() {
    return this.getCampaignsByStatus('PENDING_APPROVAL');
  }
}
