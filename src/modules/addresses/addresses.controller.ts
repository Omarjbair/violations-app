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
import { AddressesService } from './addresses.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/addresses')
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) {}

    @Post()
    @Roles(UserRole.ADMIN, UserRole.USER)
    create(@Body() dto: CreateAddressDto) {
        return this.addressesService.create(dto);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: PaginationQueryDto) {
        return this.addressesService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.addressesService.findById(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateAddressDto: UpdateAddressDto,
    ) {
        return this.addressesService.update(id, updateAddressDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.addressesService.remove(id);
    }
}