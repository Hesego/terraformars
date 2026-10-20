import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
            throw new Error('FATAL: JWT_SECRET must be at least 32 characters long in production');
        }

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (request: Request) => {
                    if (request && request.cookies) {
                        return request.cookies['auth_token'] || null;
                    }
                    return null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: secret || 'super-secret-key-development-only',
        });
    }

    async validate(payload: { sub: string; email: string }) {
        const user = await this.usersService.findById(payload.sub);
        if (!user) throw new UnauthorizedException();
        return user;
    }
}
