-- AlterEnum
ALTER TYPE "role" ADD VALUE 'admin_local';

-- AlterTable
ALTER TABLE "subscriber" ADD COLUMN     "is_blocked" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "payment" SET DEFAULT true;
