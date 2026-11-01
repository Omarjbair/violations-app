import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service.js';
import type { NotificationViewer } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('v1/notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(
        @Query() query: NotificationsQueryDto,
        @CurrentUser() viewer: NotificationViewer,
    ) {
        return this.notificationsService.findAll(query, viewer);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(
        @Param('id', ParseObjectIdPipe) id: string,
        @CurrentUser() viewer: NotificationViewer,
    ) {
        return this.notificationsService.findById(id, viewer);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationsService.create(createNotificationDto);
    }

    @Patch('read-all')
    @Roles(UserRole.ADMIN, UserRole.USER)
    markAllRead(@CurrentUser('id') userId: string) {
        return this.notificationsService.markAllRead(userId);
    }

    @Patch(':id/read')
    @Roles(UserRole.ADMIN, UserRole.USER)
    markRead(
        @Param('id', ParseObjectIdPipe) id: string,
        @CurrentUser() viewer: NotificationViewer,
    ) {
        return this.notificationsService.markRead(id, viewer);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    @HttpCode(204)
    remove(
        @Param('id', ParseObjectIdPipe) id: string,
        @CurrentUser() viewer: NotificationViewer,
    ) {
        return this.notificationsService.remove(id, viewer);
    }
}
