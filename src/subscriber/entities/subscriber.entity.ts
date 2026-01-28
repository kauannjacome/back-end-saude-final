export class Subscriber {
  id: number;
  uuid: string;
  name: string;
  municipalityName: string;
  email: string;
  telephone: string;
  cnpj: string;
  postalCode: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  stateName: string;
  stateAcronym: string;
  stateLogo: string | null;
  municipalLogo: string | null;
  administrationLogo: string | null;
  payment: boolean;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
