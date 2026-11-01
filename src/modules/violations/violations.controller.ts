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
import { ViolationsService } from './violations.service.js';
import { CreateViolationDto } from './dto/create-violation.dto.js';
import { UpdateViolationDto } from './dto/update-violation.dto.js';
import { ViolationsQueryDto } from './dto/violations-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('v1/violations')
export class ViolationsController {
    constructor(private readonly violationsService: ViolationsService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: ViolationsQueryDto) {
        return this.violationsService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.violationsService.findById(id);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.USER)
    create(
        @Body() createViolationDto: CreateViolationDto,
        @CurrentUser('id') officerId: string,
    ) {
        return this.violationsService.create(createViolationDto, officerId);
    }

    @Patch(':id/cancel')
    @Roles(UserRole.ADMIN)
    cancel(@Param('id', ParseObjectIdPipe) id: string) {
        return this.violationsService.cancel(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateViolationDto: UpdateViolationDto,
    ) {
        return this.violationsService.update(id, updateViolationDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.violationsService.remove(id);
    }
}
