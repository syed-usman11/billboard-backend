import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AddonsService {
  constructor(private prisma: PrismaService) {}

  async getAllAddons() {
    return this.prisma.addon.findMany({
      where: { isActive: true },
    });
  }

  async getAddonById(id: string) {
    const addon = await this.prisma.addon.findUnique({
      where: { id },
    });

    if (!addon) {
      throw new NotFoundException('Addon not found');
    }

    return addon;
  }

  async createAddon(data: any) {
    return this.prisma.addon.create({
      data,
    });
  }

  async updateAddon(id: string, data: any) {
    return this.prisma.addon.update({
      where: { id },
      data,
    });
  }

  async deleteAddon(id: string) {
    return this.prisma.addon.delete({
      where: { id },
    });
  }
}
