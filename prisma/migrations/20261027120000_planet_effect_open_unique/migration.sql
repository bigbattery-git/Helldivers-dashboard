-- Close duplicate open intervals left by overlapping runs, keeping the earliest, so the index can be built.
UPDATE "planet_effect" AS e
SET "ended_at" = e."last_seen_at"
WHERE e."ended_at" IS NULL
  AND EXISTS (
    SELECT 1 FROM "planet_effect" AS o
    WHERE o."planet_index" = e."planet_index"
      AND o."effect_id" = e."effect_id"
      AND o."ended_at" IS NULL
      AND o."id" < e."id"
  );

-- CreateIndex
CREATE UNIQUE INDEX "planet_effect_open_key" ON "planet_effect"("planet_index", "effect_id") WHERE (ended_at IS NULL);
