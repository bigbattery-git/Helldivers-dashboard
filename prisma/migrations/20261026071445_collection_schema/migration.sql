-- CreateTable
CREATE TABLE "war" (
    "id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ NOT NULL,
    "time_offset_sec" INTEGER,
    "info_updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "war_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet" (
    "index" INTEGER NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ko" TEXT,
    "sector" TEXT,
    "max_health" INTEGER NOT NULL,
    "disabled" BOOLEAN NOT NULL,
    "initial_owner" SMALLINT NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL,
    "position_y" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "planet_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "planet_effect" (
    "id" BIGSERIAL NOT NULL,
    "planet_index" INTEGER NOT NULL,
    "effect_id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "last_seen_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "planet_effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planet_snapshot" (
    "planet_index" INTEGER NOT NULL,
    "slot" TIMESTAMPTZ NOT NULL,
    "owner" SMALLINT NOT NULL,
    "health" INTEGER NOT NULL,
    "regen_per_second" DOUBLE PRECISION NOT NULL,
    "players" INTEGER NOT NULL,
    "event_health" INTEGER,

    CONSTRAINT "planet_snapshot_pkey" PRIMARY KEY ("planet_index","slot")
);

-- CreateTable
CREATE TABLE "planet_event" (
    "id" INTEGER NOT NULL,
    "planet_index" INTEGER NOT NULL,
    "event_type" INTEGER NOT NULL,
    "race" SMALLINT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "max_health" INTEGER NOT NULL,
    "campaign_id" INTEGER NOT NULL,

    CONSTRAINT "planet_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" INTEGER NOT NULL,
    "planet_index" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "race" SMALLINT NOT NULL,
    "count" INTEGER NOT NULL,
    "first_seen_at" TIMESTAMPTZ NOT NULL,
    "last_seen_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "briefing" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_seen_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_snapshot" (
    "assignment_id" BIGINT NOT NULL,
    "slot" TIMESTAMPTZ NOT NULL,
    "progress" JSONB NOT NULL,

    CONSTRAINT "assignment_snapshot_pkey" PRIMARY KEY ("assignment_id","slot")
);

-- CreateTable
CREATE TABLE "news_item" (
    "id" BIGSERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title_en" TEXT,
    "body_en" TEXT,
    "title_ko" TEXT,
    "body_ko" TEXT,
    "url" TEXT,
    "published_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "news_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_snapshot" (
    "slot" TIMESTAMPTZ NOT NULL,
    "steam_players" INTEGER NOT NULL,

    CONSTRAINT "global_snapshot_pkey" PRIMARY KEY ("slot")
);

-- CreateTable
CREATE TABLE "war_stats_snapshot" (
    "slot" TIMESTAMPTZ NOT NULL,
    "galaxy_stats" JSONB NOT NULL,

    CONSTRAINT "war_stats_snapshot_pkey" PRIMARY KEY ("slot")
);

-- CreateIndex
CREATE INDEX "planet_effect_ended_at_idx" ON "planet_effect"("ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "planet_effect_planet_index_effect_id_started_at_key" ON "planet_effect"("planet_index", "effect_id", "started_at");

-- CreateIndex
CREATE INDEX "planet_snapshot_slot_idx" ON "planet_snapshot"("slot");

-- CreateIndex
CREATE INDEX "campaign_last_seen_at_idx" ON "campaign"("last_seen_at");

-- CreateIndex
CREATE INDEX "news_item_published_at_idx" ON "news_item"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_item_source_external_id_key" ON "news_item"("source", "external_id");
