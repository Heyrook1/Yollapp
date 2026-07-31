import { getEnv } from "@/lib/env";

/**
 * Kanaldan bağımsız bildirim mimarisi (Phase 14).
 *
 * ÖNEMLİ: Gerçek SMS/push sağlayıcısı yapılandırılmadı. Gönderim yapılmadığında
 * fonksiyon "başarılı" DÖNMEZ — `delivered: false` ve sebep döner, çağıran
 * tarafın bunu ele alması gerekir (sessiz başarısızlık yasak).
 */

export type NotificationEvent =
  | "shipment_created"
  | "courier_search_started"
  | "courier_assigned"
  | "package_picked_up"
  | "delivery_completed"
  | "delivery_failed"
  | "courier_application_submitted"
  | "courier_approved"
  | "courier_rejected"
  | "payment_failed"
  | "payout_processed"
  | "incident_updated";

export type NotificationChannel = "in_app" | "sms" | "email" | "push";

/** Türkçe şablonlar tek yerde — component içine gömülü metin yok. */
export const notificationTemplates: Record<
  NotificationEvent,
  { title: string; body: (ctx: NotificationContext) => string }
> = {
  shipment_created: {
    title: "Gönderin oluşturuldu",
    body: (c) => `${c.shipmentCode} numaralı gönderin oluşturuldu.`,
  },
  courier_search_started: {
    title: "Kurye aranıyor",
    body: (c) => `${c.shipmentCode} için yakındaki kuryeler bilgilendirildi.`,
  },
  courier_assigned: {
    title: "Kurye atandı",
    body: (c) => `${c.shipmentCode} için kurye yola çıkıyor.`,
  },
  package_picked_up: {
    title: "Paket teslim alındı",
    body: (c) => `${c.shipmentCode} kurye tarafından teslim alındı.`,
  },
  delivery_completed: {
    title: "Teslim edildi",
    body: (c) => `${c.shipmentCode} başarıyla teslim edildi.`,
  },
  delivery_failed: {
    title: "Teslimat tamamlanamadı",
    body: (c) => `${c.shipmentCode} teslim edilemedi. Destek ekibimiz ilgileniyor.`,
  },
  courier_application_submitted: {
    title: "Başvurun alındı",
    body: () => "Kurye başvurun incelemeye alındı.",
  },
  courier_approved: {
    title: "Başvurun onaylandı",
    body: () => "Artık iş kabul edebilirsin.",
  },
  courier_rejected: {
    title: "Başvurun onaylanmadı",
    body: () => "Başvurun bu kez onaylanmadı. Detaylar uygulamada.",
  },
  payment_failed: {
    title: "Ödeme alınamadı",
    body: (c) => `${c.shipmentCode} için ödeme tamamlanamadı.`,
  },
  payout_processed: {
    title: "Ödemen gönderildi",
    body: () => "Para çekme talebin işleme alındı.",
  },
  incident_updated: {
    title: "Destek kaydın güncellendi",
    body: (c) => `${c.shipmentCode} ile ilgili kaydında güncelleme var.`,
  },
};

export type NotificationContext = {
  /** Kişisel veri değil — yalnızca gönderi kodu (CLAUDE.md §6.6). */
  shipmentCode: string;
};

export type NotificationResult = {
  event: NotificationEvent;
  channel: NotificationChannel;
  delivered: boolean;
  /** Gönderilemediyse sebebi — sessizce yutulmaz. */
  reason?: string;
};

export type NotificationProvider = {
  readonly name: string;
  readonly isOperational: boolean;
  send(params: {
    event: NotificationEvent;
    channel: NotificationChannel;
    recipientUserId: string;
    context: NotificationContext;
    /** Aynı olayın iki kez gönderilmesini engeller. */
    idempotencyKey: string;
  }): Promise<NotificationResult>;
};

/** Sağlayıcı yok: gönderim yapılmaz ve bu AÇIKÇA raporlanır. */
const unavailableProvider: NotificationProvider = {
  name: "none",
  isOperational: false,
  async send({ event, channel }) {
    return {
      event,
      channel,
      delivered: false,
      reason: "Bildirim sağlayıcısı yapılandırılmadı (SMS_PROVIDER=none).",
    };
  },
};

/** Geliştirme adaptörü: yalnızca loglar, gerçek gönderim iddia etmez. */
const logProvider: NotificationProvider = {
  name: "log",
  isOperational: false,
  async send({ event, channel, recipientUserId, context }) {
    console.info("[notification:dev]", {
      event,
      channel,
      recipientUserId,
      shipmentCode: context.shipmentCode,
    });
    return {
      event,
      channel,
      delivered: false,
      reason: "Geliştirme adaptörü — mesaj yalnızca loglandı, gönderilmedi.",
    };
  },
};

export function getNotificationProvider(): NotificationProvider {
  const env = getEnv();
  switch (env.SMS_PROVIDER) {
    case "log":
      return logProvider;
    case "none":
    default:
      return unavailableProvider;
  }
}
