-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('ko', 'en');

-- CreateEnum
CREATE TYPE "NewsSource" AS ENUM ('steam', 'dispatch', 'x');

-- CreateTable
CREATE TABLE "war" (
    "id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "war_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet" (
    "index" SMALLINT NOT NULL,
    "position_x" REAL NOT NULL,
    "position_y" REAL NOT NULL,
    "max_health" INTEGER NOT NULL,
    "owner" SMALLINT NOT NULL,
    "health" INTEGER NOT NULL,
    "players" INTEGER NOT NULL,
    "campaign_type" SMALLINT,
    "attacked_by" SMALLINT[] DEFAULT ARRAY[]::SMALLINT[],
    "effect_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "current_event_id" INTEGER,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "planet_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "planet_event" (
    "id" INTEGER NOT NULL,
    "planet_index" SMALLINT NOT NULL,
    "event_type" SMALLINT NOT NULL,
    "faction" SMALLINT NOT NULL,
    "health" INTEGER NOT NULL,
    "max_health" INTEGER NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "campaign_id" INTEGER,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "planet_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet_snapshot" (
    "planet_index" SMALLINT NOT NULL,
    "slot" TIMESTAMPTZ NOT NULL,
    "owner" SMALLINT NOT NULL,
    "health" INTEGER NOT NULL,
    "players" INTEGER NOT NULL,
    "event_health" INTEGER,

    CONSTRAINT "planet_snapshot_pkey" PRIMARY KEY ("planet_index","slot")
);

-- CreateTable
CREATE TABLE "major_order" (
    "id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "briefing" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "tasks" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "major_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "major_order_progress" (
    "order_id" BIGINT NOT NULL,
    "slot" TIMESTAMPTZ NOT NULL,
    "progress" BIGINT[],

    CONSTRAINT "major_order_progress_pkey" PRIMARY KEY ("order_id","slot")
);

-- CreateTable
CREATE TABLE "global_snapshot" (
    "slot" TIMESTAMPTZ NOT NULL,
    "steam_players" INTEGER,

    CONSTRAINT "global_snapshot_pkey" PRIMARY KEY ("slot")
);

-- CreateTable
CREATE TABLE "news_item" (
    "id" BIGSERIAL NOT NULL,
    "source" "NewsSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "patch_notes" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "url" TEXT,
    "published_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "news_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_payload" (
    "source" TEXT NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL,
    "body" JSONB NOT NULL,

    CONSTRAINT "raw_payload_pkey" PRIMARY KEY ("source")
);

-- CreateIndex
CREATE UNIQUE INDEX "planet_current_event_id_key" ON "planet"("current_event_id");

-- CreateIndex
CREATE INDEX "planet_event_planet_index_idx" ON "planet_event"("planet_index");

-- CreateIndex
CREATE INDEX "planet_snapshot_slot_idx" ON "planet_snapshot" USING BRIN ("slot");

-- CreateIndex
CREATE INDEX "news_item_published_at_idx" ON "news_item"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_item_source_external_id_key" ON "news_item"("source", "external_id");

-- AddForeignKey
ALTER TABLE "planet" ADD CONSTRAINT "planet_current_event_id_fkey" FOREIGN KEY ("current_event_id") REFERENCES "planet_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planet_snapshot" ADD CONSTRAINT "planet_snapshot_planet_index_fkey" FOREIGN KEY ("planet_index") REFERENCES "planet"("index") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "major_order_progress" ADD CONSTRAINT "major_order_progress_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "major_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

