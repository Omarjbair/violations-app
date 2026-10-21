import { PartialType } from '@nestjs/mapped-types';
import { CreateCitizenDto } from './create-citizen.dto.js';

export class UpdateCitizenDto extends PartialType(CreateCitizenDto) {}