/*
  Warnings:

  - You are about to drop the column `declaration_date` on the `regulation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "regulation" DROP COLUMN "declaration_date",
ADD COLUMN     "type_declaration" TEXT;
