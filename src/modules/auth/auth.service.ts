import {
    ForbiddenException,
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import jwtConfig from '../../config/jwt.config.js';
import { UsersService } from '../users/users.service.js';
import { UserDocument } from '../users/schemas/user.schema.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
        @Inject(jwtConfig.KEY) private readonly cfg: ConfigType<typeof jwtConfig>,
    ) {}

    async login(loginDto: LoginDto) {
        const user = await this.users.findForLogin(loginDto.login);

        const valid = user && (await bcrypt.compare(loginDto.password, user.password));
        if (!user || !valid) {
            throw new UnauthorizedException('بيانات الدخول غير صحيحة');
        }
        if (!user.is_active) {
            throw new ForbiddenException('الحساب معطّل');
        }

        return this.issueTokens(user);
    }

    async refresh(userId: string, refreshToken: string) {
        const user = await this.users.findWithRefreshHash(userId);

        if (!user || !user.is_active || !user.refresh_token_hash) {
            throw new UnauthorizedException('الجلسة غير صالحة');
        }

        const incoming = Buffer.from(this.hash(refreshToken));
        const stored = Buffer.from(user.refresh_token_hash);
        const matches = incoming.length === stored.length && timingSafeEqual(incoming, stored);

        if (!matches) {
            await this.users.setRefreshTokenHash(userId, null);
            throw new UnauthorizedException('الجلسة غير صالحة');
        }

        return this.issueTokens(user);
    }

    async logout(userId: string) {
        await this.users.setRefreshTokenHash(userId, null);
    }

    async register(registerDto: RegisterDto) {
        const { username, phone, password, first_name, last_name } = registerDto;

        const user = await this.users.create({
            username,
            phone,
            password,
            first_name,
            last_name,
        });

        return this.issueTokens(user);
    }

    private async issueTokens(user: UserDocument) {
        const payload = { sub: user.id as string, role: user.role };

        const [access_token, refresh_token] = await Promise.all([
            this.jwt.signAsync(payload, {
                secret: this.cfg.secret as string ,
                expiresIn: this.cfg.expiresIn,
            }),
            this.jwt.signAsync(
                { ...payload, jti: randomUUID() },
                {
                    secret: this.cfg.refreshSecret as string,
                    expiresIn: this.cfg.refreshExpiresIn,
                },
            ),
        ]);

        await this.users.setRefreshTokenHash(user.id, this.hash(refresh_token));

        return { access_token, refresh_token };
    }

    private hash(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
}