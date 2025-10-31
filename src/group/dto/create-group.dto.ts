import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  subscriber_id: number;
}
