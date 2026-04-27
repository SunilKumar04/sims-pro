import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@school.edu.in' })
  @IsEmail()
  email: string;
}
