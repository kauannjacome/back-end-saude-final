import { IsOptional, IsNumberString } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsNumberString()
  offset?: number;
}
