import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesController } from './branches.controller.js';
import { BranchesService } from './branches.service.js';
import { Branch, BranchSchema } from './schemas/branch.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { AddressesModule } from '../addresses/addresses.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Branch.name, schema: BranchSchema },
            { name: User.name, schema: UserSchema },
        ]),
        AddressesModule,
    ],
    controllers: [BranchesController],
    providers: [BranchesService],
    exports: [BranchesService, MongooseModule],
})
export class BranchesModule {}
