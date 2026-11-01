import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { BranchesModule } from '../branches/branches.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        BranchesModule,
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService, MongooseModule],
})
export class UsersModule {}
