import { PartialType } from '@nestjs/mapped-types';
import { CreateCurrencyDto } from './create-currency.dto.js';

export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {}
