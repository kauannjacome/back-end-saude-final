import { IsString, IsInt } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  name: string;

  @IsInt()
  subscriber_id: number;
}
