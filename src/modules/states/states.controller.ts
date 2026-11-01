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
import { StatesService } from './states.service.js';
import { CreateStateDto } from './dto/create-state.dto.js';
import { UpdateStateDto } from './dto/update-state.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Controller('v1/states')
@Roles(UserRole.ADMIN)
export class StatesController {
    constructor(private readonly statesService: StatesService) {}

    @Get()
    findAll(@Query() query: PaginationQueryDto) {
        return this.statesService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.statesService.findById(id);
    }

    @Post()
    create(@Body() createStateDto: CreateStateDto) {
        return this.statesService.create(createStateDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updateStateDto: UpdateStateDto,
    ) {
        return this.statesService.update(id, updateStateDto);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.statesService.remove(id);
    }
}
