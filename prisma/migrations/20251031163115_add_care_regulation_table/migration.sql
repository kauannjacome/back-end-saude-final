-- CreateTable
CREATE TABLE "care_regulation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "care_id" INTEGER NOT NULL,
    "regulation_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "care_regulation_care_id_fkey" FOREIGN KEY ("care_id") REFERENCES "care" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "care_regulation_regulation_id_fkey" FOREIGN KEY ("regulation_id") REFERENCES "regulation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "care_regulation_care_id_idx" ON "care_regulation"("care_id");

-- CreateIndex
CREATE INDEX "care_regulation_regulation_id_idx" ON "care_regulation"("regulation_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_regulation_care_id_regulation_id_key" ON "care_regulation"("care_id", "regulation_id");
