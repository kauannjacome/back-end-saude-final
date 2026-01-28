import { Status, ResourceOrigin, UnitMeasure, TypeDeclaration, Priority } from '@prisma/client';

export class Care {
  id: number;
  uuid: string;
  name: string;
  nameNormalized: string | null;
  acronym: string | null;
  description: string | null;
  status: Status;
  resourceOrigin: ResourceOrigin;
  priority: Priority;
  unitMeasure: UnitMeasure;
  typeDeclaration: TypeDeclaration | null;
  value: number | null;
  amount: number | null;
  minDeadlineDays: number | null;
  groupId: number | null;
  professionalId: number | null;
  supplierId: number | null;
  subscriberId: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
