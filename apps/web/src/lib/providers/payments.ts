import { ConflictError, type AmountMinor } from "@yolla/core";
import { getEnv } from "@/lib/env";

/**
 * Ödeme sağlayıcı arayüzü (Phase 11).
 *
 * ÖNEMLİ: Şu an yapılandırılmış gerçek sağlayıcı YOK. Bu dosya sahte bir
 * entegrasyonu "canlı" gibi göstermez — `none` adaptörü açıkça hata döner ve
 * `payments` özellik bayrağı bunu kullanıcıya dürüstçe bildirir.
 *
 * Gerçek sağlayıcı bağlanırken uyulacak kurallar:
 * - Client'tan gelen "ödeme başarılı" bilgisine ASLA güvenilmez.
 * - Webhook imzası doğrulanmadan hiçbir gönderi PAID yapılmaz.
 * - Tekrarlı webhook'lar idempotency anahtarıyla tekilleştirilir.
 */

export type PaymentIntent = {
  id: string;
  amountMinor: AmountMinor;
  currency: "TRY";
  status: "requires_payment" | "processing" | "succeeded" | "failed";
  clientSecret?: string;
};

export type PaymentProvider = {
  readonly name: string;
  /** Sağlayıcı gerçekten para tahsil edebiliyor mu? */
  readonly isOperational: boolean;
  createIntent(params: {
    shipmentId: string;
    amountMinor: AmountMinor;
    idempotencyKey: string;
  }): Promise<PaymentIntent>;
  /** Sunucu tarafı doğrulama — client iddiası yeterli değildir. */
  verifyPayment(intentId: string): Promise<PaymentIntent>;
  refund(params: {
    intentId: string;
    amountMinor: AmountMinor;
    idempotencyKey: string;
  }): Promise<{ id: string; status: "succeeded" | "failed" }>;
  /** Webhook imza doğrulaması. İmzasız/geçersiz olay reddedilir. */
  verifyWebhookSignature(payload: string, signature: string): boolean;
};

const PROVIDER_MISSING =
  "Ödeme sağlayıcısı yapılandırılmadı. Gerçek tahsilat yapılamaz.";

/**
 * Sağlayıcı yokken kullanılan adaptör. Sessizce "başarılı" DÖNMEZ —
 * her çağrı açıkça hata verir ki sahte ödeme production'a sızmasın.
 */
const unavailableProvider: PaymentProvider = {
  name: "none",
  isOperational: false,
  async createIntent() {
    throw new ConflictError(PROVIDER_MISSING);
  },
  async verifyPayment() {
    throw new ConflictError(PROVIDER_MISSING);
  },
  async refund() {
    throw new ConflictError(PROVIDER_MISSING);
  },
  verifyWebhookSignature() {
    // İmza doğrulanamıyorsa fail-closed.
    return false;
  },
};

/**
 * Operasyon ekibinin elle tahsilat işaretlediği pilot adaptörü.
 * Otomatik tahsilat YAPMAZ; yalnızca admin'in manuel kaydını temsil eder.
 */
const manualProvider: PaymentProvider = {
  name: "manual",
  isOperational: false,
  async createIntent({ shipmentId, amountMinor }) {
    return {
      id: `manual_${shipmentId}`,
      amountMinor,
      currency: "TRY",
      status: "requires_payment",
    };
  },
  async verifyPayment() {
    throw new ConflictError(
      "Manuel ödeme modunda doğrulama operasyon ekibi tarafından yapılır.",
    );
  },
  async refund() {
    throw new ConflictError("Manuel ödeme modunda iade elle yapılır.");
  },
  verifyWebhookSignature() {
    return false;
  },
};

export function getPaymentProvider(): PaymentProvider {
  const env = getEnv();
  switch (env.PAYMENTS_PROVIDER) {
    case "manual":
      return manualProvider;
    case "none":
    default:
      return unavailableProvider;
  }
}
