import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStudentDto {
  @ApiProperty({ required: false }) @IsString()     @IsOptional() name?:        string;
  @ApiProperty({ required: false }) @IsString()     @IsOptional() roll?:        string;
  @ApiProperty({ required: false }) @IsString()     @IsOptional() className?:   string;
  @ApiProperty({ required: false }) @IsString()     @IsOptional() phone?:       string;
  @ApiProperty({ required: false }) @IsString()     @IsOptional() parentName?:  string;
  @ApiProperty({ required: false }) @IsString()     @IsOptional() parentPhone?: string;
  @ApiProperty({ required: false }) @IsString()     @IsOptional() address?:     string;
  @ApiProperty({ required: false }) @IsDateString() @IsOptional() dob?:         string;
}
