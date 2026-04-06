import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() roll: string;
  @ApiProperty() @IsString() className: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() parentName: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() parentPhone?: string;
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsDateString() dob: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() password?: string;
}
