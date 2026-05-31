import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolCode?: string;

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
