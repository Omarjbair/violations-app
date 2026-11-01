import {
    ForbiddenException,
    Inject,
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import jwtConfig from '../../config/jwt.config.js';
import { RedisService } from '../../redis/redis.service.js';
import { UsersService } from '../users/users.service.js';
import { UserDocument } from '../users/schemas/user.schema.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const SESSION_UNAVAILABLE = 'خدمة الجلسات غير متاحة حالياً';
const INVALID_SESSION = 'الجلسة غير صالحة';

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
        private readonly redis: RedisService,
        @Inject(jwtConfig.KEY)
        private readonly cfg: ConfigType<typeof jwtConfig>,
    ) {}

    async login(loginDto: LoginDto) {
        const user = await this.users.findForLogin(loginDto.login);

        const valid =
            user && (await bcrypt.compare(loginDto.password, user.password));
        if (!user || !valid) {
            throw new UnauthorizedException('بيانات الدخول غير صحيحة');
        }
        if (!user.is_active) {
            throw new ForbiddenException('الحساب معطّل');
        }

        return this.issueTokens(user);
    }

    async refresh(userId: string, refreshToken: string, sessionId?: string) {
        const user = await this.users.findActiveById(userId);

        if (!user || !user.is_active || !sessionId) {
            throw new UnauthorizedException(INVALID_SESSION);
        }

        const key = this.sessionKey(userId, sessionId);
        let stored: string | null;

        try {
            stored = await this.redis.get(key);
        } catch {
            throw new ServiceUnavailableException(SESSION_UNAVAILABLE);
        }

        if (!stored || !this.matches(refreshToken, stored)) {
            if (stored) {
                await this.redis.del(key).catch(() => undefined);
            }

            throw new UnauthorizedException(INVALID_SESSION);
        }

        try {
            await this.redis.del(key);
        } catch {
            throw new ServiceUnavailableException(SESSION_UNAVAILABLE);
        }

        return this.issueTokens(user);
    }

    async logout(userId: string, sessionId?: string): Promise<void> {
        if (!sessionId) return;

        try {
            await this.redis.del(this.sessionKey(userId, sessionId));
        } catch {
            throw new ServiceUnavailableException(SESSION_UNAVAILABLE);
        }
    }

    async logoutAll(userId: string): Promise<void> {
        try {
            await this.redis.deleteByPrefix(`session:${userId}:`);
        } catch {
            throw new ServiceUnavailableException(SESSION_UNAVAILABLE);
        }
    }

    async register(registerDto: RegisterDto) {
        const { username, phone, password, first_name, last_name } =
            registerDto;

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
        const refreshJti = randomUUID();
        const accessJti = randomUUID();
        const payload = { sub: user.id as string, role: user.role };

        const [access_token, refresh_token] = await Promise.all([
            this.jwt.signAsync(
                { ...payload, jti: accessJti, sid: refreshJti },
                {
                    secret: this.cfg.secret as string,
                    expiresIn: this.cfg.expiresIn,
                },
            ),
            this.jwt.signAsync(
                { ...payload, jti: refreshJti },
                {
                    secret: this.cfg.refreshSecret as string,
                    expiresIn: this.cfg.refreshExpiresIn,
                },
            ),
        ]);

        await this.storeSession(user.id, refreshJti, refresh_token);

        return { access_token, refresh_token };
    }

    private async storeSession(
        userId: string,
        sessionId: string,
        refreshToken: string,
    ): Promise<void> {
        const decoded = this.jwt.decode(refreshToken) as {
            exp?: number;
        } | null;
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded?.exp
            ? Math.max(1, decoded.exp - now)
            : 7 * 24 * 60 * 60;

        try {
            await this.redis.set(
                this.sessionKey(userId, sessionId),
                this.hash(refreshToken),
                ttl,
            );
        } catch {
            throw new ServiceUnavailableException(SESSION_UNAVAILABLE);
        }
    }

    private sessionKey(userId: string, sessionId: string): string {
        return `session:${userId}:${sessionId}`;
    }

    private matches(token: string, storedHash: string): boolean {
        const incoming = Buffer.from(this.hash(token));
        const stored = Buffer.from(storedHash);

        return (
            incoming.length === stored.length &&
            timingSafeEqual(incoming, stored)
        );
    }

    private hash(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }
}
