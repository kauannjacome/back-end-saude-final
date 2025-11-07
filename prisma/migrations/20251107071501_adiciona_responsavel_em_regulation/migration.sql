-- AlterTable
ALTER TABLE "regulation" ADD COLUMN     "responsible_id" INTEGER;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
