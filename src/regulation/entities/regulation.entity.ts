import { Status, Relationship, Priority, TypeDeclaration } from '@prisma/client';

export class Regulation {
  id: number;
  uuid: string;
  idCode: string | null;
  status: Status;
  notes: string | null;
  clinicalIndication: string | null;
  requestingProfessional: string | null;
  urlRequirement: string | null;
  urlPreDocument: string | null;
  urlCurrentDocument: string | null;
  folderId: number | null;
  relationship: Relationship | null;
  requestDate: Date | null;
  scheduledDate: Date | null;
  priority: Priority;
  history: number;
  versionDocument: number;
  typeDeclaration: TypeDeclaration | null;
  patientId: number | null;
  creatorId: number | null;
  analyzedId: number | null;
  printerId: number | null;
  supplierId: number | null;
  subscriberId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  responsibleId: number | null;
}
