import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existing = await this.userModel.findOne({
            $or: [
                { username: createUserDto.username },
                { phone: createUserDto.phone },
            ],
        });

        if (existing) {
            throw new ConflictException('اسم المستخدم أو رقم الهاتف مستخدم مسبقاً',);
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        const created = new this.userModel({
            ...createUserDto,
            password: hashedPassword,
        });

        return await created.save();
    }


    async findAll(): Promise<User[]> {
        return this.userModel.find({ deleted_at: null });
    }

    async findById(id: string): Promise<UserDocument> {
        const user = await this.userModel.findOne({ _id: id, deleted_at: null });

        if (!user) throw new NotFoundException('المستخدم غير موجود');

        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.userModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!user) {
            throw new NotFoundException('المستخدم غير موجود');
        }


        const conflictFilters: any[] = [];
        if (updateUserDto.username) {
            conflictFilters.push({ username: updateUserDto.username });
        }
        if (updateUserDto.phone) {
            conflictFilters.push({ phone: updateUserDto.phone });
        }

        if (conflictFilters.length > 0) {
            const existing = await this.userModel.findOne({
                $or: conflictFilters,
                _id: { $ne: id },
                deleted_at: null,
            });

            if (existing) {
                if (updateUserDto.username && existing.username === updateUserDto.username) {
                    throw new ConflictException('اسم المستخدم مستخدم مسبقاً');
                }
                
                if (updateUserDto.phone && existing.phone === updateUserDto.phone) {
                    throw new ConflictException('رقم الهاتف مستخدم مسبقاً');
                }
            }
        }

        const updated = await this.userModel
            .findOneAndUpdate(
                { _id: id, deleted_at: null },
                updateUserDto,
                { new: true },
            );

        if (!updated) {
            throw new NotFoundException('المستخدم غير موجود');
        }

        return updated;
    }

    async remove(id: string): Promise<void> {
        const existing = await this.userModel.findOne({ _id: id, deleted_at: null });

        if (!existing) throw new NotFoundException('المستخدم غير موجود');

        await this.userModel.findByIdAndUpdate(id, { deleted_at: new Date() });
    }
}