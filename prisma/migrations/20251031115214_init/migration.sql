-- CreateTable
CREATE TABLE "subscriber" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "unit_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "object_type" TEXT NOT NULL,
    "object_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "occurred_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "professional" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "care" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "description" TEXT,
    "authorization_id" TEXT,
    "status" TEXT,
    "resource" TEXT DEFAULT 'nao_especificado',
    "unit_measure" TEXT NOT NULL,
    "priority" TEXT,
    "value" REAL,
    "amount" INTEGER,
    "group_id" INTEGER,
    "professional_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "care_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "care_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "care_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "folder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "id_code" TEXT,
    "description" TEXT,
    "responsible_id" INTEGER,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "care_id" INTEGER,
    "group_id" INTEGER,
    "sub_group_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "folder_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "folder_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "folder_care_id_fkey" FOREIGN KEY ("care_id") REFERENCES "care" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "group_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "cpf" TEXT NOT NULL,
    "cns" TEXT,
    "full_name" TEXT NOT NULL,
    "social_name" TEXT,
    "gender" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "sex" TEXT,
    "birth_date" DATETIME NOT NULL,
    "death_date" DATETIME,
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
    "accepted_terms_at" DATETIME,
    "accepted_terms_version" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "patient_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "professional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "cpf" TEXT NOT NULL,
    "name" TEXT,
    "professional_name" TEXT,
    "cargo" TEXT,
    "sex" TEXT,
    "birth_date" DATETIME,
    "phone_number" TEXT,
    "email" TEXT,
    "role" TEXT,
    "password_hash" TEXT,
    "is_password_temp" BOOLEAN NOT NULL DEFAULT false,
    "number_try" INTEGER DEFAULT 0,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
    "accepted_terms_at" DATETIME,
    "accepted_terms_version" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "professional_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regulation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "id_code" TEXT,
    "patient_id" INTEGER,
    "request_date" DATETIME,
    "scheduled_date" DATETIME,
    "status" TEXT,
    "notes" TEXT,
    "url_requirement" TEXT,
    "url_pre_document" TEXT,
    "url_current_document" TEXT,
    "folder_id" INTEGER,
    "relationship" TEXT,
    "caregiver_id" TEXT,
    "creator_id" INTEGER,
    "analyzed_id" INTEGER,
    "printer_id" INTEGER,
    "supplier_id" INTEGER,
    "history" INTEGER,
    "version_document" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "regulation_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "regulation_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "regulation_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "regulation_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "regulation_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "professional" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "regulation_analyzed_id_fkey" FOREIGN KEY ("analyzed_id") REFERENCES "professional" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "regulation_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "professional" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "supplier_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "folder_group_id_idx" ON "folder"("group_id");

-- CreateIndex
CREATE INDEX "folder_sub_group_id_idx" ON "folder"("sub_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_uuid_key" ON "group"("uuid");

-- CreateIndex
CREATE INDEX "group_subscriber_id_idx" ON "group"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_uuid_key" ON "patient"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "patient_cpf_key" ON "patient"("cpf");

-- CreateIndex
CREATE INDEX "patient_subscriber_id_idx" ON "patient"("subscriber_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_uuid_key" ON "professional"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "professional_cpf_key" ON "professional"("cpf");

-- CreateIndex
CREATE INDEX "professional_subscriber_id_idx" ON "professional"("subscriber_id");

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
CREATE UNIQUE INDEX "supplier_cnpj_key" ON "supplier"("cnpj");

-- CreateIndex
CREATE INDEX "supplier_subscriber_id_idx" ON "supplier"("subscriber_id");
