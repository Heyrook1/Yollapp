-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_counters_key_key" ON "rate_limit_counters"("key");

-- CreateIndex
CREATE INDEX "rate_limit_counters_expires_at_idx" ON "rate_limit_counters"("expires_at");


-- Bu tablolar yalnızca sunucu tarafından kullanılır; client'a hiç açılmaz.
-- RLS açık + policy yok => authenticated rolü erişemez (CLAUDE.md §6.1).
ALTER TABLE "rate_limit_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;

-- Sayaç negatife düşemez.
ALTER TABLE "rate_limit_counters"
  ADD CONSTRAINT "rate_limit_counters_count_nonnegative" CHECK ("count" >= 0);

-- Pilot kill switch'leri varsayılan olarak AÇIK gelir; operasyon kapatabilir.
INSERT INTO "feature_flags" ("id", "enabled", "description", "updated_at") VALUES
  ('shipment_creation', true, 'Yeni gönderi oluşturma', NOW()),
  ('courier_matching',  true, 'Kurye eşleştirme ve iş kabul', NOW()),
  ('payments',          true, 'Ödeme başlatma', NOW()),
  ('payouts',           false, 'Kurye para çekme — sağlayıcı yok, kapalı', NOW()),
  ('notifications',     false, 'Bildirim gönderimi — sağlayıcı yok, kapalı', NOW()),
  ('business_bulk_import', false, 'İşletme toplu içe aktarma — henüz yok', NOW()),
  ('phone_auth',        false, 'Telefon + OTP girişi — sağlayıcı yapılandırılmadı', NOW())
ON CONFLICT ("id") DO NOTHING;
