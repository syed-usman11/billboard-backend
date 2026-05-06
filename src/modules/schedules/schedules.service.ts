import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async generateScheduleForCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { media: true, plan: true, bookings: { include: { slot: true } } },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'APPROVED') {
      throw new BadRequestException('Campaign must be approved before scheduling');
    }

    // Clear existing schedules for this campaign
    await this.prisma.schedule.deleteMany({
      where: { campaignId },
    });

    const schedules = [];
    const currentDate = new Date(campaign.startDate);

    while (currentDate <= campaign.endDate) {
      const bookings = campaign.bookings.filter((b) => {
        const slotDate = new Date(b.slot.date);
        return (
          slotDate.getFullYear() === currentDate.getFullYear() &&
          slotDate.getMonth() === currentDate.getMonth() &&
          slotDate.getDate() === currentDate.getDate()
        );
      });

      if (bookings.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const totalPlays = campaign.plan.playsPerDay;
      const playsPerSlot = Math.floor(totalPlays / bookings.length);
      const remainderPlays = totalPlays % bookings.length;

      bookings.forEach((booking, index) => {
        const slot = booking.slot;
        const plays = index < remainderPlays ? playsPerSlot + 1 : playsPerSlot;

        schedules.push({
          campaignId,
          mediaId: campaign.mediaId,
          slotId: slot.id,
          date: currentDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          playCount: plays,
          status: 'PENDING',
        });
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (schedules.length > 0) {
      await this.prisma.schedule.createMany({
        data: schedules,
      });
    }

    return { count: schedules.length, schedules };
  }

  async getTodaySchedule() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.schedule.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: 'PENDING',
      },
      include: {
        campaign: {
          include: { user: true, plan: true },
        },
        media: true,
        slot: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getScheduleByDate(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.schedule.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        campaign: {
          include: { user: true, plan: true },
        },
        media: true,
        slot: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getApprovedCampaigns() {
    return this.prisma.campaign.findMany({
      where: { status: 'APPROVED' },
      include: {
        media: true,
        plan: true,
        user: true,
        schedules: {
          include: { slot: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async getScheduleForNoveLCT(date?: Date) {
    let schedules;

    if (date) {
      schedules = await this.getScheduleByDate(date);
    } else {
      schedules = await this.getTodaySchedule();
    }

    return schedules.map((schedule) => ({
      campaignId: schedule.campaign.id,
      customerName: schedule.campaign.user.name,
      mediaUrl: schedule.media.url,
      mediaType: schedule.media.type,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      playCount: schedule.playCount,
      planName: schedule.campaign.plan.name,
      status: schedule.status,
    }));
  }

  async exportScheduleAsJSON(date?: Date) {
    const schedules = await this.getScheduleForNoveLCT(date);
    return {
      exportDate: new Date().toISOString(),
      date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      schedules,
    };
  }

  async exportScheduleAsCSV(date?: Date) {
    const schedules = await this.getScheduleForNoveLCT(date);

    const headers = [
      'Campaign ID',
      'Customer Name',
      'Media URL',
      'Media Type',
      'Start Time',
      'End Time',
      'Play Count',
      'Plan Name',
      'Status',
    ];

    const rows = schedules.map((s) => [
      s.campaignId,
      s.customerName,
      s.mediaUrl,
      s.mediaType,
      s.startTime,
      s.endTime,
      s.playCount,
      s.planName,
      s.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    return csv;
  }

  async markScheduleAsRunning(scheduleId: string) {
    return this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'RUNNING' },
    });
  }

  async markScheduleAsCompleted(scheduleId: string) {
    return this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'COMPLETED' },
    });
  }

  async regenerateSchedule(campaignId: string) {
    return this.generateScheduleForCampaign(campaignId);
  }
}
