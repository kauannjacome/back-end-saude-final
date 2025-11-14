-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete', 'view');

-- CreateEnum
CREATE TYPE "status" AS ENUM ('recebido', 'em_andamento', 'aprovado', 'autorizado', 'reprovado', 'removido');

-- CreateEnum
CREATE TYPE "unit_measure" AS ENUM ('mg', 'g', 'mcg', 'kg', 'ml', 'l', 'amp', 'comp', 'caps', 'fr', 'tub', 'dose', 'ui', 'cx', 'un', 'sessao', 'diaria', 'medida', 'pomada', 'creme', 'gel');

-- CreateEnum
CREATE TYPE "priority" AS ENUM ('eletivo', 'urgencia', 'emergencia');

-- CreateEnum
CREATE TYPE "model" AS ENUM ('declaration', 'authorize', 'provider', 'patient');

-- CreateEnum
CREATE TYPE "folder_type" AS ENUM ('procedimento', 'grupo', 'sub_grupo');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('masculino', 'feminino', 'outro', 'nao_informado');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'usuario');

-- CreateEnum
CREATE TYPE "relationship" AS ENUM ('amigo_a', 'genitor_a', 'cuidador_a', 'namorado_a', 'esposo_a', 'tio_a', 'irma_o', 'primo_a', 'sobrinho_a');

-- CreateEnum
CREATE TYPE "resource_origin" AS ENUM ('nao_especificado', 'municipal', 'estadual', 'federal');

-- CreateTable
CREATE TABLE "subscriber" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "municipality_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "state_acronym" TEXT NOT NULL,
    "state_logo" TEXT,
    "municipal_logo" TEXT,
    "administration_logo" TEXT,
    "payment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "object_type" TEXT NOT NULL,
    "object_id" INTEGER NOT NULL,
    "action" "audit_action" NOT NULL,
    "detail" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "description" TEXT,
    "status" "status",
    "resource" "resource_origin" DEFAULT 'nao_especificado',
    "unit_measure" "unit_measure" NOT NULL,
    "priority" "priority",
    "value" DOUBLE PRECISION,
    "amount" INTEGER,
    "group_id" INTEGER,
    "professional_id" INTEGER,
    "supplier_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "care_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "id_code" TEXT,
    "description" TEXT,
    "responsible_id" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "cpf" TEXT NOT NULL,
    "cns" TEXT,
    "full_name" TEXT NOT NULL,
    "social_name" TEXT,
    "gender" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "sex" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "death_date" TIMESTAMP(3),
    "mother_name" TEXT,
    "father_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "postal_code" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "nationality" TEXT,
    "naturalness" TEXT,
    "marital_status" TEXT,
    "blood_type" TEXT,
    "password_hash" TEXT,
    "is_password_temp" BOOLEAN NOT NULL DEFAULT false,
    "number_try" INTEGER DEFAULT 0,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms_at" TIMESTAMP(3),
    "accepted_terms_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "cpf" TEXT NOT NULL,
    "name" TEXT,
    "cargo" TEXT,
    "sex" "sex",
    "birth_date" TIMESTAMP(3),
    "phone_number" TEXT,
    "email" TEXT,
    "role" "role",
    "password_hash" TEXT,
    "is_password_temp" BOOLEAN NOT NULL DEFAULT false,
    "number_try" INTEGER DEFAULT 0,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms_at" TIMESTAMP(3),
    "accepted_terms_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "id_code" TEXT,
    "patient_id" INTEGER,
    "responsible_id" INTEGER,
    "request_date" TIMESTAMP(3),
    "scheduled_date" TIMESTAMP(3),
    "declaration_date" TIMESTAMP(3),
    "status" "status",
    "notes" TEXT,
    "url_requirement" TEXT,
    "url_pre_document" TEXT,
    "url_current_document" TEXT,
    "folder_id" INTEGER,
    "relationship" "relationship",
    "priority" "priority" DEFAULT 'eletivo',
    "requesting_professional" TEXT,
    "creator_id" INTEGER,
    "analyzed_id" INTEGER,
    "printer_id" INTEGER,
    "supplier_id" INTEGER,
    "history" INTEGER,
    "version_document" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "regulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_regulation" (
    "id" SERIAL NOT NULL,
    "care_id" INTEGER NOT NULL,
    "regulation_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_regulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_uuid_key" ON "subscriber"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_cnpj_key" ON "subscriber"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "unit_uuid_key" ON "unit"("uuid");

-- CreateIndex
CREATE INDEX "unit_subscriber_id_idx" ON "unit"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_uuid_key" ON "audit_log"("uuid");

-- CreateIndex
CREATE INDEX "audit_log_subscriber_id_idx" ON "audit_log"("subscriber_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_object_type_object_id_idx" ON "audit_log"("object_type", "object_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_uuid_key" ON "care"("uuid");

-- CreateIndex
CREATE INDEX "care_subscriber_id_idx" ON "care"("subscriber_id");

-- CreateIndex
CREATE INDEX "care_group_id_idx" ON "care"("group_id");

-- CreateIndex
CREATE INDEX "care_professional_id_idx" ON "care"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "folder_uuid_key" ON "folder"("uuid");

-- CreateIndex
CREATE INDEX "folder_subscriber_id_idx" ON "folder"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_uuid_key" ON "group"("uuid");

-- CreateIndex
CREATE INDEX "group_subscriber_id_idx" ON "group"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_uuid_key" ON "patient"("uuid");

-- CreateIndex
CREATE INDEX "patient_subscriber_id_idx" ON "patient"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_subscriber_id_cpf_key" ON "patient"("subscriber_id", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "professional_uuid_key" ON "professional"("uuid");

-- CreateIndex
CREATE INDEX "professional_subscriber_id_idx" ON "professional"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_subscriber_id_cpf_key" ON "professional"("subscriber_id", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "regulation_uuid_key" ON "regulation"("uuid");

-- CreateIndex
CREATE INDEX "regulation_subscriber_id_idx" ON "regulation"("subscriber_id");

-- CreateIndex
CREATE INDEX "regulation_patient_id_idx" ON "regulation"("patient_id");

-- CreateIndex
CREATE INDEX "regulation_folder_id_idx" ON "regulation"("folder_id");

-- CreateIndex
CREATE INDEX "regulation_supplier_id_idx" ON "regulation"("supplier_id");

-- CreateIndex
CREATE INDEX "regulation_creator_id_idx" ON "regulation"("creator_id");

-- CreateIndex
CREATE INDEX "regulation_analyzed_id_idx" ON "regulation"("analyzed_id");

-- CreateIndex
CREATE INDEX "regulation_printer_id_idx" ON "regulation"("printer_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_uuid_key" ON "supplier"("uuid");

-- CreateIndex
CREATE INDEX "supplier_subscriber_id_idx" ON "supplier"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_subscriber_id_cnpj_key" ON "supplier"("subscriber_id", "cnpj");

-- CreateIndex
CREATE INDEX "care_regulation_care_id_idx" ON "care_regulation"("care_id");

-- CreateIndex
CREATE INDEX "care_regulation_regulation_id_idx" ON "care_regulation"("regulation_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_regulation_care_id_regulation_id_key" ON "care_regulation"("care_id", "regulation_id");

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care" ADD CONSTRAINT "care_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care" ADD CONSTRAINT "care_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care" ADD CONSTRAINT "care_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care" ADD CONSTRAINT "care_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder" ADD CONSTRAINT "folder_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder" ADD CONSTRAINT "folder_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional" ADD CONSTRAINT "professional_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_analyzed_id_fkey" FOREIGN KEY ("analyzed_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation" ADD CONSTRAINT "regulation_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_regulation" ADD CONSTRAINT "care_regulation_care_id_fkey" FOREIGN KEY ("care_id") REFERENCES "care"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_regulation" ADD CONSTRAINT "care_regulation_regulation_id_fkey" FOREIGN KEY ("regulation_id") REFERENCES "regulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
