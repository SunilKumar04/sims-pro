import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryStudentDto {
  @ApiProperty({ required: false }) @IsString() @IsOptional() className?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() search?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() feeStatus?: string;
  @ApiProperty({ required: false }) @IsNumber() @Type(() => Number) @IsOptional() page?: number;
  @ApiProperty({ required: false }) @IsNumber() @Type(() => Number) @IsOptional() limit?: number;
}
