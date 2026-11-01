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
import { BranchesService } from './branches.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/branches')
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: PaginationQueryDto) {
        return this.branchesService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.branchesService.findById(id);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createBranchDto: CreateBranchDto) {
        return this.branchesService.create(createBranchDto);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateBranchDto: UpdateBranchDto,
    ) {
        return this.branchesService.update(id, updateBranchDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.branchesService.remove(id);
    }
}
