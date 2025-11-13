/*
  Warnings:

  - You are about to drop the column `authorization_id` on the `care` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "care" DROP COLUMN "authorization_id",
ADD COLUMN     "supplier_id" INTEGER;

-- AddForeignKey
ALTER TABLE "care" ADD CONSTRAINT "care_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
