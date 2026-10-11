import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwtConfig from '../../../config/jwt.config.js';
import { UserRole } from '../../users/schemas/user.schema.js';

export interface JwtPayload {
    sub: string;
    role: UserRole;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
    constructor(@Inject(jwtConfig.KEY) cfg: ConfigType<typeof jwtConfig>) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: cfg.secret as string,
            ignoreExpiration: false,
        });
    }

    validate(payload: JwtPayload) {
        return { id: payload.sub, role: payload.role };
    }
}