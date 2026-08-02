-- Shipment docket fields + ratings (additive)

ALTER TABLE "courier_profiles"
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rating_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "shipments"
  ADD COLUMN IF NOT EXISTS "public_code" TEXT,
  ADD COLUMN IF NOT EXISTS "item_description" TEXT,
  ADD COLUMN IF NOT EXISTS "item_color" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_code_hash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_public_code_key"
  ON "shipments"("public_code");

CREATE TABLE IF NOT EXISTS "ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id" UUID NOT NULL,
  "from_user_id" UUID NOT NULL,
  "to_user_id" UUID NOT NULL,
  "stars" INTEGER NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_stars_range" CHECK ("stars" >= 1 AND "stars" <= 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS "ratings_shipment_id_key" ON "ratings"("shipment_id");
CREATE INDEX IF NOT EXISTS "ratings_to_user_id_created_at_idx" ON "ratings"("to_user_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_from_user_id_fkey"
    FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_to_user_id_fkey"
    FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;

INSERT INTO "feature_flags" ("id", "enabled", "description", "updated_at") VALUES
  ('delivery_proof', true, 'Teslim kodu zorunlu doğrulama', NOW()),
  ('ratings', true, 'Teslimat sonrası kurye puanlama', NOW())
ON CONFLICT ("id") DO NOTHING;
