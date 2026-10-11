import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import jwtConfig from '../../../config/jwt.config.js';
import type { JwtPayload } from './jwt-access.strategy.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(@Inject(jwtConfig.KEY) cfg: ConfigType<typeof jwtConfig>) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
            secretOrKey: cfg.refreshSecret as string,
            ignoreExpiration: false,
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: JwtPayload) {
        return {
            id: payload.sub,
            role: payload.role,
            refresh_token: req.body.refresh_token as string,
        };
    }
}