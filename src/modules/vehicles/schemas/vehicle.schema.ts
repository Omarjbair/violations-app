import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

export const DEFAULT_PLATE_CATEGORY = 'private';

export enum VehicleType {
    CAR = 'car',
    MOTORCYCLE = 'motorcycle',
    TRUCK = 'truck',
    BUS = 'bus',
    VAN = 'van',
    OTHER = 'other',
}

const MAX_MANUFACTURE_YEAR = new Date().getFullYear() + 1;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Vehicle {
    @Prop({
        required: [true, 'رقم اللوحة مطلوب'],
        trim: true,
        uppercase: true,
    })
    plate_number: string;

    @Prop({
        required: [true, 'رمز اللوحة مطلوب'],
        trim: true,
        uppercase: true,
    })
    plate_code: string;

    @Prop({
        required: [true, 'فئة اللوحة مطلوبة'],
        trim: true,
        default: DEFAULT_PLATE_CATEGORY,
    })
    plate_category: string;

    @Prop({
        type: String,
        enum: {
            values: Object.values(VehicleType),
            message: 'نوع المركبة غير صالح',
        },
        required: [true, 'نوع المركبة مطلوب'],
    })
    vehicle_type: VehicleType;

    @Prop({ required: [true, 'الشركة المصنعة مطلوبة'], trim: true })
    make: string;

    @Prop({ required: [true, 'الطراز مطلوب'], trim: true })
    model: string;

    @Prop({ trim: true })
    color: string;

    @Prop({
        type: Number,
        required: [true, 'سنة الصنع مطلوبة'],
        min: [1900, 'سنة الصنع غير صالحة'],
        max: [MAX_MANUFACTURE_YEAR, 'سنة الصنع غير صالحة'],
    })
    manufacture_year: number;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

VehicleSchema.index(
    { plate_number: 1, plate_code: 1, plate_category: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);
