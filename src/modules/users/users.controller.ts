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
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { UserRole } from './schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/users')
@Roles(UserRole.ADMIN)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    findAll(@Query() query: PaginationQueryDto) {
        return this.usersService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.usersService.findById(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.usersService.remove(id);
    }
}
