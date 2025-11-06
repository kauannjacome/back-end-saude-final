import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export enum TipoDocumento {
  requirement = 'requirement',
  pre = 'pre',
  current = 'current',
}

export class getDocumentUrl {
  @IsNotEmpty({ message: 'O tipo é obrigatório.' })
  @IsEnum(TipoDocumento, { message: 'O tipo deve ser requirement, pre ou current.' })
  type: TipoDocumento;

  @IsNotEmpty({ message: 'A chave é obrigatória.' })
  @IsNumber({}, { message: 'A chave deve ser um número.' })
  id: number;
}
