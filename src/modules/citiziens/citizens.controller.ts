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
import { CitizensService } from './citizens.service.js';
import { CreateCitizenDto } from './dto/create-citizen.dto.js';
import { UpdateCitizenDto } from './dto/update-citizen.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/citizens')
@Roles(UserRole.ADMIN)
export class CitizensController {
    constructor(private readonly citizensService: CitizensService) {}

    @Get()
    findAll(@Query() query: PaginationQueryDto) {
        return this.citizensService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.citizensService.findById(id);
    }

    @Post()
    create(@Body() createCitizenDto: CreateCitizenDto) {
        return this.citizensService.create(createCitizenDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateCitizenDto: UpdateCitizenDto,
    ) {
        return this.citizensService.update(id, updateCitizenDto);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.citizensService.remove(id);
    }
}