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
import { VehiclesService } from './vehicles.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { CreateVehicleOwnerDto } from './dto/create-vehicle-owner.dto.js';
import { UpdateVehicleOwnerDto } from './dto/update-vehicle-owner.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/vehicles')
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: PaginationQueryDto) {
        return this.vehiclesService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.vehiclesService.findById(id);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createVehicleDto: CreateVehicleDto) {
        return this.vehiclesService.create(createVehicleDto);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateVehicleDto: UpdateVehicleDto,
    ) {
        return this.vehiclesService.update(id, updateVehicleDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.vehiclesService.remove(id);
    }

    @Get(':vehicleId/owners')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAllOwners(
        @Param('vehicleId', ParseObjectIdPipe) vehicleId: string,
        @Query() query: PaginationQueryDto,
    ) {
        return this.vehiclesService.findAllOwners(vehicleId, query);
    }

    @Post(':vehicleId/owners')
    @Roles(UserRole.ADMIN)
    createOwner(
        @Param('vehicleId', ParseObjectIdPipe) vehicleId: string,
        @Body() createVehicleOwnerDto: CreateVehicleOwnerDto,
    ) {
        return this.vehiclesService.createOwner(
            vehicleId,
            createVehicleOwnerDto,
        );
    }

    @Patch(':vehicleId/owners/:ownerId')
    @Roles(UserRole.ADMIN)
    updateOwner(
        @Param('vehicleId', ParseObjectIdPipe) vehicleId: string,
        @Param('ownerId', ParseObjectIdPipe) ownerId: string,
        @Body() updateVehicleOwnerDto: UpdateVehicleOwnerDto,
    ) {
        return this.vehiclesService.updateOwner(
            vehicleId,
            ownerId,
            updateVehicleOwnerDto,
        );
    }

    @Delete(':vehicleId/owners/:ownerId')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    removeOwner(
        @Param('vehicleId', ParseObjectIdPipe) vehicleId: string,
        @Param('ownerId', ParseObjectIdPipe) ownerId: string,
    ) {
        return this.vehiclesService.removeOwner(vehicleId, ownerId);
    }
}
