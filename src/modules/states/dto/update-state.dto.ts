import { PartialType } from '@nestjs/mapped-types';
import { CreateStateDto } from './create-state.dto.js';

export class UpdateStateDto extends PartialType(CreateStateDto) {}