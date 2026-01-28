export class Group {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  subscriberId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
