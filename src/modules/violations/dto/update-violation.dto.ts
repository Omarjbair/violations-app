import { PartialType } from '@nestjs/mapped-types';
import { CreateViolationDto } from './create-violation.dto.js';

export class UpdateViolationDto extends PartialType(CreateViolationDto) {}
