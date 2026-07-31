import { AppRole, CourierStatus, type User } from "@yolla/db";
import { ForbiddenError, UnauthorizedError } from "@yolla/core";
import type { SessionUser } from "@/lib/auth";

/**
 * Merkezî yetki politikası (CLAUDE.md §6.2/§6.3).
 *
 * Uygulama genelinde dağınık `roles.includes(...)` karşılaştırmaları YASAK.
 * Her yetki kararı buradan geçer, böylece tek yerden denetlenebilir ve test edilebilir.
 *
 * Client tarafında route gizlemek YETKİ DEĞİLDİR — bu modül server'da çalışır.
 */

export type Capability =
  | "shipment:create"
  | "shipment:cancel"
  | "shipment:view"
  | "courier:apply"
  | "courier:accept_job"
  | "courier:progress_job"
  | "courier:wallet"
  | "courier:request_payout"
  | "incident:create"
  | "admin:access"
  | "admin:review_courier"
  | "admin:manage_shipments"
  | "admin:manage_payouts";

/** Hesabın tamamen askıya alındığı durumlar — hiçbir korumalı işlem yapılamaz. */
export type AccountState = {
  user: User;
  courierStatus: CourierStatus | null;
};

function has(user: User, role: AppRole): boolean {
  return user.roles.includes(role);
}

export function isApprovedCourier(state: AccountState): boolean {
  return has(state.user, AppRole.COURIER) && state.courierStatus === CourierStatus.APPROVED;
}

export function isCourierSuspended(state: AccountState): boolean {
  return (
    state.courierStatus === CourierStatus.SUSPENDED ||
    state.courierStatus === CourierStatus.DISABLED
  );
}

export function can(state: AccountState, capability: Capability): boolean {
  const { user } = state;
  const admin = has(user, AppRole.ADMIN);

  switch (capability) {
    // Her kayıtlı kullanıcı varsayılan olarak gönderici.
    case "shipment:create":
    case "shipment:cancel":
    case "shipment:view":
    case "incident:create":
      return has(user, AppRole.SENDER) || admin;

    case "courier:apply":
      // Askıya alınmış/devre dışı kurye yeniden başvuramaz.
      return !isCourierSuspended(state);

    case "courier:accept_job":
    case "courier:progress_job":
    case "courier:wallet":
    case "courier:request_payout":
      return isApprovedCourier(state);

    case "admin:access":
    case "admin:review_courier":
    case "admin:manage_shipments":
    case "admin:manage_payouts":
      return admin;
  }
}

const capabilityMessages: Record<Capability, string> = {
  "shipment:create": "Gönderi oluşturma yetkiniz yok.",
  "shipment:cancel": "Bu gönderiyi iptal etme yetkiniz yok.",
  "shipment:view": "Bu gönderiye erişim yok.",
  "courier:apply": "Kurye başvurusu yapamazsınız.",
  "courier:accept_job": "İş kabul etmek için onaylı kurye olmalısınız.",
  "courier:progress_job": "Bu işlemi yapmak için onaylı kurye olmalısınız.",
  "courier:wallet": "Kurye cüzdanına erişim yok.",
  "courier:request_payout": "Para çekme yetkiniz yok.",
  "incident:create": "Sorun bildirme yetkiniz yok.",
  "admin:access": "Bu alana erişim yetkiniz yok.",
  "admin:review_courier": "Kurye başvurusu değerlendirme yetkiniz yok.",
  "admin:manage_shipments": "Gönderi yönetme yetkiniz yok.",
  "admin:manage_payouts": "Ödeme yönetme yetkiniz yok.",
};

export function assertCan(state: AccountState, capability: Capability): void {
  if (!can(state, capability)) {
    throw new ForbiddenError(capabilityMessages[capability]);
  }
}

/** Kaynak sahipliği — "URL'i bilen erişir" durumunu engeller (CLAUDE.md §6.3). */
export function assertOwnsOrAdmin(
  state: AccountState,
  ownerId: string,
  message = "Bu kayda erişim yok.",
): void {
  const isOwner = state.user.id === ownerId;
  const isAdmin = has(state.user, AppRole.ADMIN);
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(message);
  }
}

/** Gönderiye erişim: gönderici, atanmış kurye ya da admin. */
export function canViewShipment(
  state: AccountState,
  shipment: { senderId: string; courierId: string | null },
): boolean {
  return (
    shipment.senderId === state.user.id ||
    (shipment.courierId !== null && shipment.courierId === state.user.id) ||
    has(state.user, AppRole.ADMIN)
  );
}

export function assertSession(session: SessionUser | null): asserts session is SessionUser {
  if (!session) {
    throw new UnauthorizedError("Oturum gerekli");
  }
}

/**
 * Kurye kendi gönderisini taşıyamaz — çıkar çatışması ve kötüye kullanım
 * (kendi kendine iş yaratıp komisyon manipülasyonu) engellenir.
 */
export function assertNotSelfDelivery(courierId: string, senderId: string): void {
  if (courierId === senderId) {
    throw new ForbiddenError("Kendi gönderinizi kurye olarak alamazsınız.");
  }
}
