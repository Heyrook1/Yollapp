import { assertAmountMinor, multiplyMinor, type AmountMinor } from "./money";

/**
 * Çift kayıtlı defter hesaplamaları — saf fonksiyonlar.
 *
 * Bakiye ASLA bir kolon değildir; her zaman defter satırlarının toplamıdır
 * (CLAUDE.md §5.2). Bu modül React/Prisma bilmez, %100 test edilebilir.
 */

export type LedgerEntryType =
  | "DELIVERY_EARNING"
  | "PLATFORM_COMMISSION"
  | "BONUS"
  | "TIP"
  | "ADJUSTMENT"
  | "REFUND_DEDUCTION"
  | "PAYOUT"
  | "PAYOUT_REVERSAL";

export type LedgerEntryStatus = "PENDING" | "AVAILABLE" | "PAID";

export type LedgerEntryLike = {
  type: LedgerEntryType;
  status: LedgerEntryStatus;
  /** İşaretli integer kuruş: pozitif = cüzdana alacak, negatif = borç. */
  amountMinor: number;
};

export type WalletBalances = {
  /** Çekilebilir: teslim edilmiş ve henüz ödenmemiş. */
  availableMinor: AmountMinor;
  /** Devam eden teslimatlardan doğacak kazanç. */
  pendingMinor: AmountMinor;
  /** Geçmişte ödenmiş toplam. */
  paidMinor: AmountMinor;
  /** Tüm satırların toplamı — defterin tek doğruluk kaynağı. */
  totalMinor: number;
  /** Kuryeye yazılan brüt kazanç (komisyon hariç). */
  grossEarningsMinor: AmountMinor;
  /** Kaynakta kesilen toplam komisyon (pozitif gösterilir). */
  totalCommissionMinor: AmountMinor;
};

const POSITIVE_TYPES: ReadonlySet<LedgerEntryType> = new Set([
  "DELIVERY_EARNING",
  "BONUS",
  "TIP",
  "PAYOUT_REVERSAL",
]);

const NEGATIVE_TYPES: ReadonlySet<LedgerEntryType> = new Set([
  "PLATFORM_COMMISSION",
  "REFUND_DEDUCTION",
  "PAYOUT",
]);

/** Tip ile işaretin tutarlılığını doğrular. DB'de de CHECK constraint olarak var. */
export function assertEntrySignValid(entry: LedgerEntryLike): void {
  if (!Number.isInteger(entry.amountMinor)) {
    throw new Error("amountMinor must be an integer (kuruş)");
  }
  if (entry.amountMinor === 0) {
    throw new Error("amountMinor must not be zero");
  }
  if (POSITIVE_TYPES.has(entry.type) && entry.amountMinor < 0) {
    throw new Error(`${entry.type} must have a positive amount`);
  }
  if (NEGATIVE_TYPES.has(entry.type) && entry.amountMinor > 0) {
    throw new Error(`${entry.type} must have a negative amount`);
  }
}

/**
 * Cüzdan bakiyelerini defter satırlarından türetir.
 * Cache'lenirse bu fonksiyonun sonucuyla doğrulanır.
 */
export function computeWalletBalances(entries: readonly LedgerEntryLike[]): WalletBalances {
  let availableMinor = 0;
  let pendingMinor = 0;
  let paidMinor = 0;
  let totalMinor = 0;
  let grossEarningsMinor = 0;
  let totalCommissionMinor = 0;

  for (const entry of entries) {
    assertEntrySignValid(entry);
    totalMinor += entry.amountMinor;

    if (entry.type === "PLATFORM_COMMISSION") {
      totalCommissionMinor += -entry.amountMinor;
    }
    if (POSITIVE_TYPES.has(entry.type)) {
      grossEarningsMinor += entry.amountMinor;
    }

    switch (entry.status) {
      case "PENDING":
        pendingMinor += entry.amountMinor;
        break;
      case "AVAILABLE":
        availableMinor += entry.amountMinor;
        break;
      case "PAID":
        paidMinor += entry.amountMinor;
        break;
    }
  }

  return {
    availableMinor: Math.max(0, availableMinor),
    pendingMinor: Math.max(0, pendingMinor),
    paidMinor,
    totalMinor,
    grossEarningsMinor,
    totalCommissionMinor,
  };
}

export type DeliveryEarningSplit = {
  grossMinor: AmountMinor;
  commissionMinor: AmountMinor;
  netMinor: AmountMinor;
};

/**
 * Teslimat bedelini kurye alacağı ve platform komisyonuna böler.
 * Komisyon KAYNAKTA kesilir; yuvarlama yalnızca money.ts üzerinden yapılır.
 */
export function splitDeliveryEarning(
  grossMinor: AmountMinor,
  commissionBps: number,
): DeliveryEarningSplit {
  assertAmountMinor(grossMinor);
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new Error("commissionBps must be an integer between 0 and 10000");
  }
  const commissionMinor = multiplyMinor(grossMinor, commissionBps / 10_000);
  return {
    grossMinor,
    commissionMinor,
    netMinor: grossMinor - commissionMinor,
  };
}

/** Çekilebilir tutar, mevcut bakiyeyi aşamaz. */
export function assertPayoutAllowed(
  requestedMinor: AmountMinor,
  balances: WalletBalances,
): void {
  assertAmountMinor(requestedMinor);
  if (requestedMinor === 0) {
    throw new Error("payout amount must be greater than zero");
  }
  if (requestedMinor > balances.availableMinor) {
    throw new Error("payout amount exceeds available balance");
  }
}
