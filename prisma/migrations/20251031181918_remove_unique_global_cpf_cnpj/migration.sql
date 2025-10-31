/*
  Warnings:

  - A unique constraint covering the columns `[subscriber_id,cpf]` on the table `patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subscriber_id,cpf]` on the table `professional` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subscriber_id,cnpj]` on the table `supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "supplier_cnpj_key";

-- CreateIndex
CREATE UNIQUE INDEX "patient_subscriber_id_cpf_key" ON "patient"("subscriber_id", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "professional_subscriber_id_cpf_key" ON "professional"("subscriber_id", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_subscriber_id_cnpj_key" ON "supplier"("subscriber_id", "cnpj");
