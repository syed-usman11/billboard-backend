import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalRevenue, activeCampaigns, pendingApprovals, totalCampaigns, totalUsers] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
      }),
      this.prisma.campaign.count({
        where: { status: 'RUNNING' },
      }),
      this.prisma.campaign.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      this.prisma.campaign.count(),
      this.prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      activeCampaigns,
      pendingApprovals,
      totalCampaigns,
      totalUsers,
    };
  }

  async getSlotOccupancy(date: Date) {
    const slots = await this.prisma.slot.findMany({
      where: { date },
      include: { bookings: true },
    });

    return slots.map((slot) => ({
      slotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxCapacity: slot.maxCapacity,
      bookedCapacity: slot.bookedCapacity,
      isBlocked: slot.isBlocked,
    }));
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
      },
      include: {
        campaign: { include: { user: true } },
        media: true,
        slot: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getAllPayments() {
    return this.prisma.payment.findMany({
      include: {
        campaign: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllCampaigns() {
    return this.prisma.campaign.findMany({
      include: {
        user: true,
        media: true,
        plan: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditLogs(limit: number = 100) {
    return this.prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
