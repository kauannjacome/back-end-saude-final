import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsString()
  trade_name: string;

  @IsString()
  cnpj: string;

  @IsInt()
  subscriber_id: number;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
