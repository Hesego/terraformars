import { Controller, Post, Body, Get, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(dto);
        
        res.cookie('auth_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return token in body (for cross-subdomain compatibility)
        // Also sets HttpOnly cookie for same-origin deployments
        return { access_token: result.access_token, user: result.user };
    }

    @SkipThrottle()
    @Post('logout')
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('auth_token');
        return { message: 'Logged out successfully' };
    }

    @SkipThrottle()
    @UseGuards(JwtAuthGuard)
    @Get('me')
    me(@Request() req: any) {
        return this.authService.me(req.user.id);
    }
}
