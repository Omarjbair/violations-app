import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import {
    Notification,
    NotificationDocument,
} from './schemas/notification.schema.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';

const NOT_FOUND = 'الإشعار غير موجود';
const FORBIDDEN = 'غير مصرح بالوصول إلى هذا الإشعار';

export interface NotificationViewer {
    id: string;
    role: UserRole;
}

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name)
        private notificationModel: Model<Notification>,
        private readonly usersService: UsersService,
    ) {}

    async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
        await this.usersService.findById(dto.user_id);

        return this.notificationModel.create({
            user_id: dto.user_id,
            title: dto.title,
            body: dto.body,
            type: dto.type,
            data: dto.data,
        });
    }

    async findAll(
        query: NotificationsQueryDto,
        viewer: NotificationViewer,
    ): Promise<Paginated<Notification>> {
        const filter: Record<string, unknown> = { deleted_at: null };

        if (viewer.role === UserRole.ADMIN) {
            if (query.user_id) filter.user_id = query.user_id;
        } else {
            filter.user_id = viewer.id;
        }

        if (query.type) filter.type = query.type;

        if (query.is_read === true) {
            filter.read_at = { $ne: null };
        } else if (query.is_read === false) {
            filter.read_at = null;
        }

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            filter.created_at = range;
        }

        if (query.search) {
            const regex = {
                $regex: this.escapeRegex(query.search),
                $options: 'i',
            };

            filter.$or = [{ title: regex }, { body: regex }];
        }

        return paginate(
            this.notificationModel,
            filter as QueryFilter<Notification>,
            query,
            { created_at: -1 },
        );
    }

    async findById(
        id: string,
        viewer: NotificationViewer,
    ): Promise<NotificationDocument> {
        const notification = await this.findDocument(id);
        this.assertAccess(notification, viewer);

        await notification.populate(
            'user_id',
            'username first_name last_name phone',
        );

        return notification;
    }

    async markRead(
        id: string,
        viewer: NotificationViewer,
    ): Promise<NotificationDocument> {
        const notification = await this.findDocument(id);
        this.assertAccess(notification, viewer);

        if (notification.read_at) return notification;

        const updated = await this.notificationModel.findOneAndUpdate(
            { _id: id, deleted_at: null, read_at: null },
            { read_at: new Date() },
            { new: true },
        );

        return updated ?? (await this.findDocument(id));
    }

    async markAllRead(userId: string): Promise<{ updated: number }> {
        const result = await this.notificationModel.updateMany(
            { user_id: userId, deleted_at: null, read_at: null },
            { read_at: new Date() },
        );

        return { updated: result.modifiedCount };
    }

    async remove(id: string, viewer: NotificationViewer): Promise<void> {
        const notification = await this.findDocument(id);
        this.assertAccess(notification, viewer);

        await this.notificationModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );
    }

    private async findDocument(id: string): Promise<NotificationDocument> {
        const notification = await this.notificationModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!notification) throw new NotFoundException(NOT_FOUND);

        return notification;
    }

    private assertAccess(
        notification: NotificationDocument,
        viewer: NotificationViewer,
    ): void {
        if (
            viewer.role !== UserRole.ADMIN &&
            notification.user_id.toString() !== viewer.id
        ) {
            throw new ForbiddenException(FORBIDDEN);
        }
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
