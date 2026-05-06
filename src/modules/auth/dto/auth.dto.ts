import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  // Can be email, username, or phone number
  @IsString()
  identifier: string;

  @IsString()
  password: string;
}

export class AuthResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}
