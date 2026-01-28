export class Supplier {
  id: number;
  uuid: string;
  name: string;
  tradeName: string | null;
  cnpj: string;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  subscriberId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
