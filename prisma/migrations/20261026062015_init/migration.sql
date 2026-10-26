-- CreateTable
CREATE TABLE "collection_run" (
    "id" BIGSERIAL NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "results" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "collection_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_run_started_at_idx" ON "collection_run"("started_at");
