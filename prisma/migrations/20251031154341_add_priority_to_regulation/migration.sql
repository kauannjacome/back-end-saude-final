-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_regulation" (
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
    "priority" TEXT DEFAULT 'eletivo',
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
INSERT INTO "new_regulation" ("analyzed_id", "caregiver_id", "created_at", "creator_id", "deleted_at", "folder_id", "history", "id", "id_code", "notes", "patient_id", "printer_id", "priority", "relationship", "request_date", "scheduled_date", "status", "subscriber_id", "supplier_id", "updated_at", "url_current_document", "url_pre_document", "url_requirement", "uuid", "version_document") SELECT "analyzed_id", "caregiver_id", "created_at", "creator_id", "deleted_at", "folder_id", "history", "id", "id_code", "notes", "patient_id", "printer_id", "priority", "relationship", "request_date", "scheduled_date", "status", "subscriber_id", "supplier_id", "updated_at", "url_current_document", "url_pre_document", "url_requirement", "uuid", "version_document" FROM "regulation";
DROP TABLE "regulation";
ALTER TABLE "new_regulation" RENAME TO "regulation";
CREATE UNIQUE INDEX "regulation_uuid_key" ON "regulation"("uuid");
CREATE INDEX "regulation_subscriber_id_idx" ON "regulation"("subscriber_id");
CREATE INDEX "regulation_patient_id_idx" ON "regulation"("patient_id");
CREATE INDEX "regulation_folder_id_idx" ON "regulation"("folder_id");
CREATE INDEX "regulation_supplier_id_idx" ON "regulation"("supplier_id");
CREATE INDEX "regulation_creator_id_idx" ON "regulation"("creator_id");
CREATE INDEX "regulation_analyzed_id_idx" ON "regulation"("analyzed_id");
CREATE INDEX "regulation_printer_id_idx" ON "regulation"("printer_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
