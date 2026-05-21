import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BroadcastsService {
  constructor(private prisma: PrismaService) {}

  async createBroadcast(data: {
    title: string;
    message: string;
    category: 'GENERAL' | 'ADHOC';
    expiresAt?: string;
    userIds?: string[];
    planName?: string;
    planPrice?: number;
    planPlaysPerDay?: number;
    planDurationDays?: number;
    planPeriodType?: string;
    bookingLimitPerUser?: number;
  }) {
    const { userIds, expiresAt, ...rest } = data;
    return this.prisma.broadcast.create({
      data: {
        ...rest,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        recipients:
          data.category === 'ADHOC' && userIds?.length
            ? { create: userIds.map((userId) => ({ userId })) }
            : undefined,
      },
      include: { _count: { select: { recipients: true } } },
    });
  }

  async checkPlanName(name: string) {
    const existing = await this.prisma.plan.findUnique({ where: { name } });
    return { exists: !!existing, plan: existing };
  }

  async updateLimit(id: string, bookingLimitPerUser: number | null) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    return this.prisma.broadcast.update({
      where: { id },
      data: { bookingLimitPerUser },
    });
  }

  async bookOffer(
    userId: string,
    broadcastId: string,
    data: { mediaId: string; startDate: string },
  ) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    if (broadcast.status !== 'SENT')
      throw new BadRequestException('Broadcast not yet sent');
    if (!broadcast.planName || !broadcast.planPrice)
      throw new BadRequestException('Broadcast has no plan offer attached');
    if (broadcast.expiresAt && new Date(broadcast.expiresAt) < new Date())
      throw new BadRequestException('Offer has expired');

    // Recipient check (ADHOC must have a recipient record; GENERAL is open)
    if (broadcast.category === 'ADHOC') {
      const rec = await this.prisma.broadcastRecipient.findUnique({
        where: { broadcastId_userId: { broadcastId, userId } },
      });
      if (!rec) throw new BadRequestException('You are not eligible for this offer');
    }

    // Booking limit check
    if (broadcast.bookingLimitPerUser) {
      const userBookings = await this.prisma.campaign.count({
        where: { userId, broadcastId },
      });
      if (userBookings >= broadcast.bookingLimitPerUser)
        throw new BadRequestException(
          `You've reached the booking limit (${broadcast.bookingLimitPerUser}) for this offer`,
        );
    }

    // Media check
    const media = await this.prisma.media.findUnique({
      where: { id: data.mediaId },
    });
    if (!media || media.userId !== userId)
      throw new BadRequestException('Invalid media selection');

    // Lazy plan creation: reuse if a plan already exists by sourceBroadcastId or name
    let plan = await this.prisma.plan.findFirst({
      where: { sourceBroadcastId: broadcastId },
    });
    if (!plan) {
      plan = await this.prisma.plan.findUnique({
        where: { name: broadcast.planName },
      });
    }
    if (!plan) {
      plan = await this.prisma.plan.create({
        data: {
          name: broadcast.planName,
          price: broadcast.planPrice,
          playsPerDay: broadcast.planPlaysPerDay ?? 10,
          periodType: (broadcast.planPeriodType as any) || 'FULL_DAY',
          durationDays: broadcast.planDurationDays ?? 30,
          description: `Offer plan from broadcast: ${broadcast.title}`,
          isActive: false,
          sourceBroadcastId: broadcastId,
        },
      });
    }

    // Calculate end date
    const start = new Date(data.startDate);
    const durationDays = plan.durationDays ?? 30;
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);

    // Create campaign in PENDING_APPROVAL
    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        mediaId: data.mediaId,
        planId: plan.id,
        broadcastId,
        startDate: start,
        endDate: end,
        totalAmount: plan.price,
        status: 'PENDING_APPROVAL',
      },
      include: { plan: true, media: true },
    });

    return campaign;
  }

  async getAllBroadcasts() {
    return this.prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { recipients: true } } },
    });
  }

  async getBroadcastById(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id },
      include: {
        recipients: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { recipients: true } },
      },
    });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    return broadcast;
  }

  async updateBroadcast(id: string, data: any) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    if (broadcast.status === 'SENT')
      throw new BadRequestException('Cannot edit a sent broadcast');
    const { expiresAt, userIds, ...rest } = data;
    return this.prisma.broadcast.update({
      where: { id },
      data: { ...rest, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
    });
  }

  async sendBroadcast(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    if (broadcast.status === 'SENT') throw new BadRequestException('Already sent');

    if (broadcast.category === 'GENERAL') {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      await this.prisma.broadcastRecipient.createMany({
        data: users.map((u) => ({ broadcastId: id, userId: u.id })),
        skipDuplicates: true,
      });
    }

    return this.prisma.broadcast.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async deleteBroadcast(id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    if (broadcast.status === 'SENT')
      throw new BadRequestException('Cannot delete a sent broadcast');
    return this.prisma.broadcast.delete({ where: { id } });
  }

  async getMyBroadcasts(userId: string) {
    return this.prisma.broadcastRecipient.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { broadcast: true },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.broadcastRecipient.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markAsRead(broadcastId: string, userId: string) {
    return this.prisma.broadcastRecipient.updateMany({
      where: { broadcastId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.broadcastRecipient.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
