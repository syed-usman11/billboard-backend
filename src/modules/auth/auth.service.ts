import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SignUpDto, LoginDto, AuthResponseDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new BadRequestException('Email already exists');

    if (dto.username) {
      const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (existingUsername) throw new BadRequestException('Username already taken');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findFirst({ where: { phone: dto.phone } });
      if (existingPhone) throw new BadRequestException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: 'USER',
      },
    });

    const tokens = this.generateTokens(user.id);
    return { id: user.id, email: user.email, name: user.name, role: user.role, ...tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identifier = dto.identifier.trim();

    // Detect identifier type and find user
    let user = null;

    const isEmail = identifier.includes('@');
    const isPhone = /^[+\d][\d\s\-().]{6,}$/.test(identifier);

    if (isEmail) {
      user = await this.prisma.user.findUnique({ where: { email: identifier } });
    } else if (isPhone) {
      user = await this.prisma.user.findFirst({ where: { phone: identifier } });
    } else {
      // Try username
      user = await this.prisma.user.findUnique({ where: { username: identifier } });
    }

    // Fallback: try all three if not found by primary detection
    if (!user) {
      try {
        user = await this.prisma.user.findUnique({ where: { email: identifier } })
          ?? await this.prisma.user.findUnique({ where: { username: identifier } })
          ?? await this.prisma.user.findFirst({ where: { phone: identifier } });
      } catch {
        // username column may not exist yet — fall back to email/phone only
        user = await this.prisma.user.findUnique({ where: { email: identifier } })
          ?? await this.prisma.user.findFirst({ where: { phone: identifier } });
      }
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    const tokens = this.generateTokens(user.id);
    return { id: user.id, email: user.email, name: user.name, role: user.role, ...tokens };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException('Invalid token');

      return this.generateTokens(user.id);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone ?? '',
      company: (user as any).company ?? '',
      address: (user as any).address ?? '',
      city: (user as any).city ?? '',
      state: (user as any).state ?? '',
      zipCode: (user as any).zipCode ?? '',
    };
  }

  async updateProfile(userId: string, dto: any) {
    const allowed = ['name', 'phone', 'company', 'address', 'city', 'state', 'zipCode'];
    const data: any = {};
    for (const key of allowed) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(user.id);
  }

  private generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      { secret: this.configService.get('JWT_SECRET'), expiresIn: this.configService.get('JWT_EXPIRATION') || '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: this.configService.get('JWT_REFRESH_SECRET'), expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d' },
    );
    return { accessToken, refreshToken };
  }
}
