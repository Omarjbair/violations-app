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
import { ViolationTypesService } from './violation-types.service.js';
import { CreateViolationTypeDto } from './dto/create-violation-type.dto.js';
import { UpdateViolationTypeDto } from './dto/update-violation-type.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/violation-types')
export class ViolationTypesController {
    constructor(
        private readonly violationTypesService: ViolationTypesService,
    ) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: PaginationQueryDto) {
        return this.violationTypesService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.violationTypesService.findById(id);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createViolationTypeDto: CreateViolationTypeDto) {
        return this.violationTypesService.create(createViolationTypeDto);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateViolationTypeDto: UpdateViolationTypeDto,
    ) {
        return this.violationTypesService.update(id, updateViolationTypeDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.violationTypesService.remove(id);
    }
}
