import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleOwnerDto } from './create-vehicle-owner.dto.js';

export class UpdateVehicleOwnerDto extends PartialType(CreateVehicleOwnerDto) {}
