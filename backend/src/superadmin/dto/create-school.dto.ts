import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  short?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cbseCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  board?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subdomain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark'] })
  @IsOptional()
  @IsIn(['light', 'dark'])
  themeMode?: 'light' | 'dark';

  @ApiProperty()
  @IsString()
  contactPerson: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({ default: 'Starter' })
  @IsOptional()
  @IsString()
  planCode?: string;

  @ApiPropertyOptional({ default: 'Temp@123456' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  tempPassword?: string;
}
