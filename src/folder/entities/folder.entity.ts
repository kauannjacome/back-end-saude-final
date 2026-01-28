export class Folder {
  id: number;
  uuid: string;
  name: string;
  idCode: string | null;
  description: string | null;
  responsibleId: number | null;
  subscriberId: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
