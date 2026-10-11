import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('v1/auth')
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly users: UsersService,
    ) {}

    @Public()
    @Post('login')
    @HttpCode(200)
    login(@Body() loginDto: LoginDto) {
        return this.auth.login(loginDto);
    }

    @Public()
    @UseGuards(JwtRefreshGuard)
    @Post('refresh')
    @HttpCode(200)
    refresh(
        @CurrentUser() user: { id: string; refresh_token: string },
        @Body() _dto: RefreshDto,
    ) {
        return this.auth.refresh(user.id, user.refresh_token);
    }

    @Public()
    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.auth.register(registerDto);
    }

    @Post('logout')
    @HttpCode(204)
    logout(@CurrentUser('id') userId: string) {
        return this.auth.logout(userId);
    }

    @Get('me')
    me(@CurrentUser('id') userId: string) {
        return this.users.findById(userId);
    }
}