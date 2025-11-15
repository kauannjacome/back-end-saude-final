import { Type } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class CreateSeedPatientDto {

  
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    subscriber_id: number;
}
