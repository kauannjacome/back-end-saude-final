import type { Prisma } from '@prisma/client';

export type DeclarationPdfData = Prisma.RegulationGetPayload<{
  include: {
    patient: true;
    subscriber: true;
    creator: true;
    analyzer: true;
    folder: true;
    supplier: true;
    cares: {
      include: {
        care: true;
      };
    };
  };
}>;
