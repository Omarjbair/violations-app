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
    Res,
    StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { PaymentsQueryDto } from './dto/payments-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('v1/payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: PaymentsQueryDto) {
        return this.paymentsService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.paymentsService.findById(id);
    }

    @Get(':id/receipt')
    @Roles(UserRole.ADMIN, UserRole.USER)
    async receipt(
        @Param('id', ParseObjectIdPipe) id: string,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const html = await this.paymentsService.getReceiptHtml(id);

        response.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `inline; filename="receipt-${id}.html"`,
        });

        return new StreamableFile(Buffer.from(html, 'utf8'));
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.USER)
    create(
        @Body() createPaymentDto: CreatePaymentDto,
        @CurrentUser('id') accountantId: string,
    ) {
        return this.paymentsService.create(createPaymentDto, accountantId);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() updatePaymentDto: UpdatePaymentDto,
    ) {
        return this.paymentsService.update(id, updatePaymentDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.paymentsService.remove(id);
    }
}
