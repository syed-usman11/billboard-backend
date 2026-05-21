import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BroadcastsService {
  constructor(private prisma: PrismaService) {}

  async createBroadcast(data: {
    title: string;
    message: string;
    category: 'GENERAL' | 'ADHOC';
    offerCode?: string;
    expiresAt?: string;
    userIds?: string[];
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
