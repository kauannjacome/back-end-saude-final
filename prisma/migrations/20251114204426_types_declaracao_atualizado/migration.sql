/*
  Warnings:

  - The `type_declaration` column on the `regulation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "type_declaration" AS ENUM ('requerimento_1', 'requerimento_2', 'residencia_pec', 'residencia_cadsus', 'atualizacao_cadsus', 'ajuda_de_custo', 'exame_alto_custo', 'autorizacao', 'desistencia', 'aih', 'transporte', 'cer', 'medicamento_continuo', 'assistencia_farmaceutica');

-- AlterTable
ALTER TABLE "regulation" ADD COLUMN     "justification" TEXT,
DROP COLUMN "type_declaration",
ADD COLUMN     "type_declaration" "type_declaration" DEFAULT 'requerimento_1';
