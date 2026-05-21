import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async getAllPlans() {
    return this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
      include: { _count: { select: { campaigns: true } } },
    });
  }

  async getPlanById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async createPlan(data: any) {
    return this.prisma.plan.create({
      data,
    });
  }

  async updatePlan(id: string, data: any) {
    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async deletePlan(id: string) {
    return this.prisma.plan.delete({
      where: { id },
    });
  }
}
