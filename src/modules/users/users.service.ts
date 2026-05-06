import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly safeSelect = {
    id: true,
    email: true,
    name: true,
    phone: true,
    role: true,
    isActive: true,
    createdAt: true,
  };

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...this.safeSelect,
          _count: { select: { campaigns: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: dto.role as any,
        isActive: true,
      },
      select: this.safeSelect,
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.getUserById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto as any,
      select: this.safeSelect,
    });
  }

  async getUserProfile(userId: string) {
    return this.getUserById(userId);
  }
}
