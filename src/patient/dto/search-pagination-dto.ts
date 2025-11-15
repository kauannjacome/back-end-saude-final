import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchPaginationDto {
  // termo de busca
  @IsOptional()
  @IsString()
  term?: string;

  // paginação: quantidade por página
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  limit?: number = 10;

  // paginação: offset
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
