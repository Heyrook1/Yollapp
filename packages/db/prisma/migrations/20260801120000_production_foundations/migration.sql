-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DELIVERY_EARNING', 'PLATFORM_COMMISSION', 'BONUS', 'TIP', 'ADJUSTMENT', 'REFUND_DEDUCTION', 'PAYOUT', 'PAYOUT_REVERSAL');

-- CreateEnum
CREATE TYPE "LedgerEntryStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('RECIPIENT_UNAVAILABLE', 'WRONG_ADDRESS', 'PACKAGE_DAMAGED', 'PACKAGE_REFUSED', 'COURIER_DELAYED', 'CANNOT_REACH_SENDER', 'CANNOT_REACH_RECIPIENT', 'SAFETY_CONCERN', 'PAYMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'LOCATION_USAGE', 'MARKETING_NOTIFICATIONS', 'COURIER_DOCUMENT_PROCESSING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CourierStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "CourierStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "CourierStatus" ADD VALUE 'DISABLED';

-- CreateTable
CREATE TABLE "tracking_tokens" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "status" "LedgerEntryStatus" NOT NULL DEFAULT 'PENDING',
    "amount_minor" INTEGER NOT NULL,
    "shipment_id" UUID,
    "payout_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "reference" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "destination" TEXT,
    "failure_reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "type" "IncidentType" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "assigned_to_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" UUID,
    "operation" TEXT NOT NULL,
    "resource_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tracking_tokens_token_hash_key" ON "tracking_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "tracking_tokens_shipment_id_idx" ON "tracking_tokens"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_status_idx" ON "ledger_entries"("wallet_id", "status");

-- CreateIndex
CREATE INDEX "ledger_entries_shipment_id_idx" ON "ledger_entries"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_reference_key" ON "payouts"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_idempotency_key_key" ON "payouts"("idempotency_key");

-- CreateIndex
CREATE INDEX "payouts_user_id_status_idx" ON "payouts"("user_id", "status");

-- CreateIndex
CREATE INDEX "incidents_status_created_at_idx" ON "incidents"("status", "created_at");

-- CreateIndex
CREATE INDEX "incidents_shipment_id_idx" ON "incidents"("shipment_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "consents_user_id_type_version_key" ON "consents"("user_id", "type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- AddForeignKey
ALTER TABLE "tracking_tokens" ADD CONSTRAINT "tracking_tokens_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- Finansal bütünlük kısıtları (CLAUDE.md §5)
-- ============================================================

-- Sıfır tutarlı defter kaydı anlamsızdır; yanlış hesaplamayı erken yakalar.
ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_amount_nonzero" CHECK ("amount_minor" <> 0);

-- Payout tutarı daima pozitif istenir; işaret defter kaydında belirlenir.
ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_amount_positive" CHECK ("amount_minor" > 0);

-- Komisyon negatif, kazanç pozitif olmalı — tip ile işaret tutarlılığı.
ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_sign_matches_type" CHECK (
    ("type" IN ('DELIVERY_EARNING', 'BONUS', 'TIP', 'PAYOUT_REVERSAL') AND "amount_minor" > 0)
    OR ("type" IN ('PLATFORM_COMMISSION', 'REFUND_DEDUCTION', 'PAYOUT') AND "amount_minor" < 0)
    OR ("type" = 'ADJUSTMENT')
  );

-- Takip token'ı süresi oluşturulma anından sonra olmalı.
ALTER TABLE "tracking_tokens"
  ADD CONSTRAINT "tracking_tokens_expiry_future" CHECK ("expires_at" > "created_at");

-- Defter kaydı değiştirilemez: tutar, tip ve idempotency anahtarı UPDATE ile değişemez.
-- Yalnızca durum alanları (status/available_at/paid_at) ilerleyebilir.
CREATE OR REPLACE FUNCTION ledger_entries_forbid_mutation()
RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW."amount_minor" IS DISTINCT FROM OLD."amount_minor"
     OR NEW."type" IS DISTINCT FROM OLD."type"
     OR NEW."idempotency_key" IS DISTINCT FROM OLD."idempotency_key"
     OR NEW."wallet_id" IS DISTINCT FROM OLD."wallet_id"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'ledger_entries is append-only: amount, type, wallet and idempotency key are immutable';
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION ledger_entries_forbid_mutation();

-- Defter kaydı silinemez.
CREATE OR REPLACE FUNCTION ledger_entries_forbid_delete()
RETURNS TRIGGER AS $fn$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only: rows cannot be deleted';
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_delete
  BEFORE DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION ledger_entries_forbid_delete();

-- ============================================================
-- RLS — yeni her tablo policy'siyle birlikte gelir (CLAUDE.md §6.1)
-- ============================================================

ALTER TABLE "tracking_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    -- Cüzdan ve defter yalnızca sahibine görünür.
    EXECUTE $p$ CREATE POLICY "wallets_select_own" ON "wallets" FOR SELECT TO authenticated USING (user_id = auth.uid()) $p$;
    EXECUTE $p$ CREATE POLICY "ledger_entries_select_own" ON "ledger_entries" FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid())
    ) $p$;
    EXECUTE $p$ CREATE POLICY "payouts_select_own" ON "payouts" FOR SELECT TO authenticated USING (user_id = auth.uid()) $p$;
    EXECUTE $p$ CREATE POLICY "consents_select_own" ON "consents" FOR SELECT TO authenticated USING (user_id = auth.uid()) $p$;
    -- Olay kaydı: bildiren veya ilgili gönderinin tarafları.
    EXECUTE $p$ CREATE POLICY "incidents_select_related" ON "incidents" FOR SELECT TO authenticated USING (
      reporter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_id AND (s.sender_id = auth.uid() OR s.courier_id = auth.uid()))
    ) $p$;
    -- Takip token'ları, denetim kayıtları ve idempotency anahtarları client'a HİÇ açılmaz.
    -- Policy tanımlanmaz => RLS altında authenticated rolü için erişim yok.
    -- Bunlara yalnızca server (service role / Prisma) erişir.
  END IF;
END $$;
