import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(date: Date, periodType?: string) {
    const where: any = {
      date: date,
      isBlocked: false,
    };

    if (periodType) {
      where.periodType = periodType;
    }

    return this.prisma.slot.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  async getSlotById(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return slot;
  }

  async createSlot(data: any) {
    return this.prisma.slot.create({
      data,
    });
  }

  async updateSlot(id: string, data: any) {
    return this.prisma.slot.update({
      where: { id },
      data,
    });
  }

  async blockSlot(id: string) {
    return this.prisma.slot.update({
      where: { id },
      data: { isBlocked: true },
    });
  }

  async unblockSlot(id: string) {
    return this.prisma.slot.update({
      where: { id },
      data: { isBlocked: false },
    });
  }

  async deleteSlot(id: string) {
    const bookings = await this.prisma.booking.count({
      where: { slotId: id },
    });

    if (bookings > 0) {
      throw new BadRequestException('Cannot delete slot with active bookings');
    }

    return this.prisma.slot.delete({
      where: { id },
    });
  }

  async checkSlotAvailability(slotId: string): Promise<boolean> {
    const slot = await this.getSlotById(slotId);

    if (slot.isBlocked) {
      return false;
    }

    return slot.bookedCapacity < slot.maxCapacity;
  }

  async reserveSlot(slotId: string) {
    const slot = await this.getSlotById(slotId);

    if (!this.checkSlotAvailability(slotId)) {
      throw new BadRequestException('Slot is fully booked');
    }

    return this.prisma.slot.update({
      where: { id: slotId },
      data: { bookedCapacity: { increment: 1 } },
    });
  }

  async releaseSlot(slotId: string) {
    return this.prisma.slot.update({
      where: { id: slotId },
      data: { bookedCapacity: { decrement: 1 } },
    });
  }

  async generateSlotsForDateRange(startDate: Date, endDate: Date, slotDuration: number = 10) {
    const slots = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      // Day slots: 8 AM to 5 PM
      let slotStart = new Date(current);
      slotStart.setHours(8, 0, 0, 0);

      while (slotStart.getHours() < 17) {
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        const existingSlot = await this.prisma.slot.findFirst({
          where: {
            date: {
              equals: current,
            },
            startTime: slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          },
        });

        if (!existingSlot) {
          slots.push({
            date: current,
            startTime: slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            periodType: 'DAY',
            maxCapacity: 1,
            bookedCapacity: 0,
            isBlocked: false,
          });
        }

        slotStart = slotEnd;
      }

      // Night slots: 5 PM to 10 PM
      slotStart = new Date(current);
      slotStart.setHours(17, 0, 0, 0);

      while (slotStart.getHours() < 22) {
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        const existingSlot = await this.prisma.slot.findFirst({
          where: {
            date: {
              equals: current,
            },
            startTime: slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          },
        });

        if (!existingSlot) {
          slots.push({
            date: current,
            startTime: slotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            endTime: slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            periodType: 'NIGHT',
            maxCapacity: 1,
            bookedCapacity: 0,
            isBlocked: false,
          });
        }

        slotStart = slotEnd;
      }

      current.setDate(current.getDate() + 1);
    }

    if (slots.length > 0) {
      return this.prisma.slot.createMany({
        data: slots,
        skipDuplicates: true,
      });
    }

    return { count: 0 };
  }
}
