import { IsString, IsDateString, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  mediaId: string;

  @IsString()
  planId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  addonIds?: string[];

  @IsOptional()
  @IsArray()
  selectedSlots?: string[];
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  mediaId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CampaignResponseDto {
  id: string;
  userId: string;
  mediaId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalAmount: number;
  createdAt: Date;
}
