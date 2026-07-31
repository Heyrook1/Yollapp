import { prisma, type Prisma } from "@yolla/db";

/**
 * Denetim kaydı — yetki gerektiren ve geri alınamaz işlemler için.
 *
 * KVKK: kişisel veri (telefon, adres, ad, e-posta, belge yolu) YAZILMAZ.
 * Yalnızca kayıt kimlikleri ve karar bilgisi tutulur (CLAUDE.md §6.6).
 */

export type AuditAction =
  | "courier.approved"
  | "courier.rejected"
  | "courier.suspended"
  | "shipment.cancelled"
  | "shipment.reassigned"
  | "payout.requested"
  | "payout.processed"
  | "payout.failed"
  | "refund.issued"
  | "pricing.updated"
  | "feature_flag.toggled"
  | "incident.resolved"
  | "tracking_token.revoked";

/** Kişisel veri sızmasın diye metadata'da yalnızca bu anahtarlara izin verilir. */
const ALLOWED_METADATA_KEYS = new Set([
  "fromStatus",
  "toStatus",
  "amountMinor",
  "commissionBps",
  "reasonCode",
  "flagId",
  "enabled",
  "previousCourierId",
  "nextCourierId",
  "incidentType",
]);

function sanitizeMetadata(metadata: Record<string, unknown>): Prisma.InputJsonValue {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return clean as Prisma.InputJsonValue;
}

export type AuditInput = {
  actorUserId: string | null;
  action: AuditAction;
  resourceType: "shipment" | "courier_profile" | "payout" | "incident" | "feature_flag" | "platform_config";
  resourceId?: string;
  /** Operasyon kararının gerekçesi — serbest metin, kişisel veri içermemeli. */
  reason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Denetim kaydı yazar. Bu çağrı iş mantığını BOZMAMALI:
 * kayıt yazılamazsa hata loglanır ama işlem geri alınmaz.
 * Transaction içinde çağrılırsa `client` geçilerek atomik yazım sağlanır.
 */
export async function writeAuditLog(
  input: AuditInput,
  client: Pick<typeof prisma, "auditLog"> = prisma,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        reason: input.reason ?? null,
        metadata: input.metadata ? sanitizeMetadata(input.metadata) : undefined,
      },
    });
  } catch (error) {
    console.error("audit log write failed", {
      action: input.action,
      resourceType: input.resourceType,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function queryAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
