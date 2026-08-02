-- Courier presence (nearby map for senders/admin) — additive

CREATE TYPE "CourierActivity" AS ENUM ('AVAILABLE', 'ON_JOB', 'BUSY');

CREATE TABLE IF NOT EXISTS "courier_presences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "courier_user_id" UUID NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "heading" DOUBLE PRECISION,
  "accuracy_meters" DOUBLE PRECISION,
  "activity" "CourierActivity" NOT NULL DEFAULT 'AVAILABLE',
  "sharing_enabled" BOOLEAN NOT NULL DEFAULT false,
  "vehicle_type" "VehicleType" NOT NULL,
  "sequence_number" INTEGER NOT NULL DEFAULT 0,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courier_presences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "courier_presences_courier_user_id_key"
  ON "courier_presences"("courier_user_id");
CREATE INDEX IF NOT EXISTS "courier_presences_sharing_enabled_activity_last_seen_at_idx"
  ON "courier_presences"("sharing_enabled", "activity", "last_seen_at");

DO $$ BEGIN
  ALTER TABLE "courier_presences"
    ADD CONSTRAINT "courier_presences_courier_user_id_fkey"
    FOREIGN KEY ("courier_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "courier_presences" ENABLE ROW LEVEL SECURITY;

INSERT INTO "feature_flags" ("id", "enabled", "description", "updated_at") VALUES
  ('courier_presence', true, 'Gönderici/admin canlı kurye varlık haritası', NOW())
ON CONFLICT ("id") DO NOTHING;
