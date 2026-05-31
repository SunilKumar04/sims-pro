import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { SuperAdminService } from '../superadmin.service';

class LoginBody {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@ApiTags('Super Admin Auth')
@Controller('superadmin/auth')
export class SuperAdminAuthController {
  constructor(private readonly service: SuperAdminService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login for super admins' })
  login(@Body() dto: LoginBody) {
    return this.service.login(dto.email, dto.password);
  }
}
