import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  priceMonthly: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAnnual?: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  studentLimit: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  teacherLimit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  storageLimitMb?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Object, default: {} })
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean | string | number>;
}
