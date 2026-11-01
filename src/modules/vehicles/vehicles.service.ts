import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    DEFAULT_PLATE_CATEGORY,
    Vehicle,
    VehicleDocument,
} from './schemas/vehicle.schema.js';
import {
    VehicleOwner,
    VehicleOwnerDocument,
} from './schemas/vehicle-owner.schema.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { CreateVehicleOwnerDto } from './dto/create-vehicle-owner.dto.js';
import { UpdateVehicleOwnerDto } from './dto/update-vehicle-owner.dto.js';
import { CitizensService } from '../citizens/citizens.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';

const NOT_FOUND = 'المركبة غير موجودة';
const OWNER_NOT_FOUND = 'سجل الملكية غير موجود';
const PLATE_TAKEN = 'رقم اللوحة مستخدم مسبقاً';
const HAS_OWNERS = 'لا يمكن حذف المركبة لوجود سجلات ملكية مرتبطة بها';
const PRIMARY_OWNER_EXISTS = 'يوجد مالك أساسي فعال لهذه المركبة';
const OWNER_RELATION_EXISTS = 'هذا المواطن مرتبط بالفعل بهذه المركبة';
const INVALID_DATES = 'تاريخ نهاية الملكية يجب أن يكون بعد تاريخ البداية';

interface PlateKey {
    plate_number: string;
    plate_code: string;
    plate_category: string;
}

interface OwnerAvailability {
    vehicle_id: string;
    citizen_id: string;
    ended_at: Date | null;
}

@Injectable()
export class VehiclesService {
    constructor(
        @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
        @InjectModel(VehicleOwner.name)
        private ownerModel: Model<VehicleOwner>,
        private readonly citizensService: CitizensService,
    ) {}

    async create(dto: CreateVehicleDto): Promise<VehicleDocument> {
        const plate = this.normalizePlate(dto);
        await this.assertPlateUnique(plate);

        try {
            return await this.vehicleModel.create({
                plate_number: plate.plate_number,
                plate_code: plate.plate_code,
                plate_category: plate.plate_category,
                vehicle_type: dto.vehicle_type,
                make: dto.make,
                model: dto.model,
                color: dto.color,
                manufacture_year: dto.manufacture_year,
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(PLATE_TAKEN);
            }
            throw error;
        }
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<Vehicle>> {
        return paginate(this.vehicleModel, { deleted_at: null }, query, {
            created_at: -1,
        });
    }

    async findById(id: string): Promise<VehicleDocument> {
        const vehicle = await this.vehicleModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!vehicle) throw new NotFoundException(NOT_FOUND);

        return vehicle;
    }

    async update(id: string, dto: UpdateVehicleDto): Promise<VehicleDocument> {
        const vehicle = await this.vehicleModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!vehicle) throw new NotFoundException(NOT_FOUND);

        const plate = this.normalizePlate({
            plate_number: dto.plate_number ?? vehicle.plate_number,
            plate_code: dto.plate_code ?? vehicle.plate_code,
            plate_category: dto.plate_category ?? vehicle.plate_category,
        });

        await this.assertPlateUnique(plate, id);

        const update: Record<string, unknown> = {};

        if (
            dto.plate_number !== undefined ||
            dto.plate_code !== undefined ||
            dto.plate_category !== undefined
        ) {
            update.plate_number = plate.plate_number;
            update.plate_code = plate.plate_code;
            update.plate_category = plate.plate_category;
        }
        if (dto.vehicle_type !== undefined) {
            update.vehicle_type = dto.vehicle_type;
        }
        if (dto.make !== undefined) update.make = dto.make;
        if (dto.model !== undefined) update.model = dto.model;
        if (dto.color !== undefined) update.color = dto.color;
        if (dto.manufacture_year !== undefined) {
            update.manufacture_year = dto.manufacture_year;
        }

        try {
            const updated = await this.vehicleModel.findOneAndUpdate(
                { _id: id, deleted_at: null },
                update,
                { new: true, runValidators: true },
            );

            if (!updated) throw new NotFoundException(NOT_FOUND);

            return updated;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(PLATE_TAKEN);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        const exists = await this.vehicleModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        const owners = await this.ownerModel.countDocuments({
            vehicle_id: id,
            deleted_at: null,
        });

        if (owners > 0) {
            throw new ConflictException(HAS_OWNERS);
        }

        await this.vehicleModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );
    }

    async createOwner(vehicleId: string, dto: CreateVehicleOwnerDto,): Promise<VehicleOwnerDocument> {
        await this.findById(vehicleId);
        await this.citizensService.findById(dto.citizen_id);

        const isPrimary = dto.is_primary ?? false;
        const startedAt = new Date(dto.started_at);
        const endedAt = dto.ended_at ? new Date(dto.ended_at) : null;

        this.assertValidDates(startedAt, endedAt);

        await this.assertOwnerAvailable(
            {
                vehicle_id: vehicleId,
                citizen_id: dto.citizen_id,
                ended_at: endedAt,
            },
            undefined,
        );

        if (isPrimary && endedAt === null) {
            await this.closeActivePrimaryOwners(vehicleId);
        }

        try {
            return await this.ownerModel.create({
                vehicle_id: vehicleId,
                citizen_id: dto.citizen_id,
                is_primary: isPrimary,
                started_at: startedAt,
                ended_at: endedAt,
            });
        } catch (error) {
            this.mapOwnerDuplicateError(error);
        }
    }

    async findAllOwners(
        vehicleId: string,
        query: PaginationQueryDto,
    ): Promise<Paginated<VehicleOwner>> {
        await this.findById(vehicleId);

        return paginate(
            this.ownerModel,
            { vehicle_id: vehicleId, deleted_at: null },
            query,
            { created_at: -1 },
        );
    }

    async updateOwner(
        vehicleId: string,
        ownerId: string,
        dto: UpdateVehicleOwnerDto,
    ): Promise<VehicleOwnerDocument> {
        const owner = await this.ownerModel.findOne({
            _id: ownerId,
            vehicle_id: vehicleId,
            deleted_at: null,
        });

        if (!owner) throw new NotFoundException(OWNER_NOT_FOUND);

        if (dto.citizen_id) {
            await this.citizensService.findById(dto.citizen_id);
        }

        const citizenId = dto.citizen_id ?? owner.citizen_id.toString();
        const isPrimary = dto.is_primary ?? owner.is_primary;
        const startedAt = dto.started_at
            ? new Date(dto.started_at)
            : owner.started_at;
        const endedAt = this.resolveEndedAt(dto.ended_at, owner.ended_at);

        this.assertValidDates(startedAt, endedAt);

        await this.assertOwnerAvailable(
            {
                vehicle_id: vehicleId,
                citizen_id: citizenId,
                ended_at: endedAt,
            },
            ownerId,
        );

        if (isPrimary && endedAt === null) {
            await this.closeActivePrimaryOwners(vehicleId, ownerId);
        }

        const update: Record<string, unknown> = {};

        if (dto.citizen_id !== undefined) update.citizen_id = dto.citizen_id;
        if (dto.is_primary !== undefined) update.is_primary = dto.is_primary;
        if (dto.started_at !== undefined) update.started_at = startedAt;
        if (dto.ended_at !== undefined) update.ended_at = endedAt;

        try {
            const updated = await this.ownerModel
                .findOneAndUpdate(
                    { _id: ownerId, vehicle_id: vehicleId, deleted_at: null },
                    update,
                    { new: true, runValidators: true },
                )
                .populate(
                    'citizen_id',
                    'national_id first_name father_name last_name phone',
                );

            if (!updated) throw new NotFoundException(OWNER_NOT_FOUND);

            return updated;
        } catch (error) {
            this.mapOwnerDuplicateError(error);
        }
    }

    async removeOwner(vehicleId: string, ownerId: string): Promise<void> {
        const result = await this.ownerModel.updateOne(
            { _id: ownerId, vehicle_id: vehicleId, deleted_at: null },
            { deleted_at: new Date() },
        );

        if (result.matchedCount === 0) {
            throw new NotFoundException(OWNER_NOT_FOUND);
        }
    }

    private normalizePlate(values: {
        plate_number: string;
        plate_code: string;
        plate_category?: string;
    }): PlateKey {
        return {
            plate_number: values.plate_number.trim().toUpperCase(),
            plate_code: values.plate_code.trim().toUpperCase(),
            plate_category:
                values.plate_category?.trim() || DEFAULT_PLATE_CATEGORY,
        };
    }

    private async assertPlateUnique(
        plate: PlateKey,
        excludeId?: string,
    ): Promise<void> {
        const filter: Record<string, unknown> = {
            ...plate,
            deleted_at: null,
        };

        if (excludeId) filter._id = { $ne: excludeId };

        const duplicate = await this.vehicleModel.findOne(filter);

        if (duplicate) throw new ConflictException(PLATE_TAKEN);
    }

    private async assertOwnerAvailable(
        values: OwnerAvailability,
        excludeOwnerId?: string,
    ): Promise<void> {
        if (values.ended_at !== null) return;

        const filter: Record<string, unknown> = {
            vehicle_id: values.vehicle_id,
            ended_at: null,
            deleted_at: null,
        };

        if (excludeOwnerId) filter._id = { $ne: excludeOwnerId };

        const relation = await this.ownerModel.exists({
            ...filter,
            citizen_id: values.citizen_id,
        });

        if (relation) throw new ConflictException(OWNER_RELATION_EXISTS);
    }

    private async closeActivePrimaryOwners(
        vehicleId: string,
        excludeOwnerId?: string,
    ): Promise<void> {
        const filter: Record<string, unknown> = {
            vehicle_id: vehicleId,
            is_primary: true,
            ended_at: null,
            deleted_at: null,
        };

        if (excludeOwnerId) filter._id = { $ne: excludeOwnerId };

        await this.ownerModel.updateMany(filter, { ended_at: new Date() });
    }

    private assertValidDates(startedAt: Date, endedAt: Date | null): void {
        if (Number.isNaN(startedAt.getTime())) {
            throw new BadRequestException('تاريخ بداية الملكية غير صالح');
        }

        if (endedAt && Number.isNaN(endedAt.getTime())) {
            throw new BadRequestException('تاريخ نهاية الملكية غير صالح');
        }

        if (endedAt && endedAt < startedAt) {
            throw new BadRequestException(INVALID_DATES);
        }
    }

    private resolveEndedAt(
        value: string | null | undefined,
        fallback: Date | null,
    ): Date | null {
        if (value === undefined) return fallback;
        if (value === null) return null;

        return new Date(value);
    }

    private mapOwnerDuplicateError(error: unknown): never {
        if (isDuplicateKeyError(error)) {
            const keyPattern =
                (error as { keyPattern?: Record<string, number> }).keyPattern ??
                {};

            if (keyPattern.citizen_id) {
                throw new ConflictException(OWNER_RELATION_EXISTS);
            }

            throw new ConflictException(PRIMARY_OWNER_EXISTS);
        }

        throw error;
    }
}
