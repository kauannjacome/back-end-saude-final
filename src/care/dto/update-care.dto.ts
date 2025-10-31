import { PartialType } from '@nestjs/mapped-types';
import { CreateCareDto } from './create-care.dto';

export class UpdateCareDto extends PartialType(CreateCareDto) {}
