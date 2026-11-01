import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Citizen } from '../../citizens/schemas/citizen.schema.js';
import { Vehicle } from './vehicle.schema.js';

export type VehicleOwnerDocument = HydratedDocument<VehicleOwner>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class VehicleOwner {
    @Prop({
        type: Types.ObjectId,
        ref: Vehicle.name,
        required: [true, 'المركبة مطلوبة'],
        index: true,
    })
    vehicle_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Citizen.name,
        required: [true, 'المواطن مطلوب'],
        index: true,
    })
    citizen_id: Types.ObjectId;

    @Prop({ default: false })
    is_primary: boolean;

    @Prop({ type: Date, required: [true, 'تاريخ بداية الملكية مطلوب'] })
    started_at: Date;

    @Prop({ type: Date, default: null })
    ended_at: Date | null;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const VehicleOwnerSchema = SchemaFactory.createForClass(VehicleOwner);

VehicleOwnerSchema.index(
    { vehicle_id: 1 },
    {
        unique: true,
        partialFilterExpression: {
            is_primary: true,
            ended_at: null,
            deleted_at: null,
        },
    },
);

VehicleOwnerSchema.index(
    { vehicle_id: 1, citizen_id: 1 },
    {
        unique: true,
        partialFilterExpression: { ended_at: null, deleted_at: null },
    },
);
