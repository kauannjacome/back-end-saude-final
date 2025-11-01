import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TipoArquivo {
  ESTADUAL = 'estadual',
  MUNICIPAL = 'municipal',
  FEDERAL = 'federal',
}

export class CreateUploadDto {
    @IsNotEmpty({ message: 'O tipo é obrigatório.' })
  @IsEnum(TipoArquivo, { message: 'O tipo deve ser estadual, municipal ou federal.' })
  tipo: TipoArquivo;
  id:number;
}
