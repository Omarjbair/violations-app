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
import { ObjectionsService } from './objections.service.js';
import { CreateObjectionDto } from './dto/create-objection.dto.js';
import { UpdateObjectionDto } from './dto/update-objection.dto.js';
import { ReviewObjectionDto } from './dto/review-objection.dto.js';
import { ObjectionsQueryDto } from './dto/objections-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('v1/objections')
export class ObjectionsController {
    constructor(private readonly objectionsService: ObjectionsService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: ObjectionsQueryDto) {
        return this.objectionsService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.objectionsService.findById(id);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.USER)
    create(@Body() createObjectionDto: CreateObjectionDto) {
        return this.objectionsService.create(createObjectionDto);
    }

    @Patch(':id/review')
    @Roles(UserRole.ADMIN)
    review(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() reviewObjectionDto: ReviewObjectionDto,
        @CurrentUser('id') reviewerId: string,
    ) {
        return this.objectionsService.review(
            id,
            reviewObjectionDto,
            reviewerId,
        );
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateObjectionDto: UpdateObjectionDto,
    ) {
        return this.objectionsService.update(id, updateObjectionDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.objectionsService.remove(id);
    }
}
