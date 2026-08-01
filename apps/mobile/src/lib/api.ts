import { getSupabase } from "./supabase";

/**
 * YOLLA API istemcisi.
 *
 * Mobil, web'in server action'larını çağıramaz; bunun yerine aynı servis
 * katmanını kullanan /api/v1 uçlarına gider (ADR 0003). Her istekte Supabase
 * erişim token'ı Bearer olarak eklenir ve sunucuda doğrulanır.
 */

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

export function isApiConfigured(): boolean {
  return Boolean(baseUrl);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError(401, "Oturumun sona ermiş. Lütfen tekrar giriş yap.");
  }
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(
      0,
      "API adresi ayarlanmadı. apps/mobile/.env içine EXPO_PUBLIC_API_URL ekleyin.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Ağ hatası sessizce yutulmaz.
    throw new ApiError(0, "Sunucuya ulaşılamadı. Bağlantını kontrol et.");
  }

  if (!response.ok) {
    let message = "İşlem tamamlanamadı.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* gövde JSON değilse genel mesaj kalır */
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

// --- Tipler (sunucu yanıtlarıyla birebir) ---

export type CatalogZone = {
  id: string;
  name: string;
  baseFeeMinor: number;
  baseFeeLabel: string;
};

export type CatalogSize = {
  id: string;
  code: string;
  name: string;
  multiplier: number;
};

export type ShipmentSummary = {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  isExpress: boolean;
  createdAt: string;
};

export type CreateShipmentInput = {
  zoneId: string;
  sizeClassId: string;
  isExpress: boolean;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
  windowStartsAt: string;
  windowEndsAt: string;
};

export type CreateShipmentResult = {
  shipmentId: string;
  status: string;
  amountMinor: number;
  amountLabel: string;
};

export type ShipmentDetail = {
  id: string;
  code: string;
  status: string;
  viewer: "sender" | "courier" | "admin";
  isExpress: boolean;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  zoneName: string;
  sizeName: string;
  amountLabel: string | null;
  windowLabel: string | null;
  events: { toStatus: string; timeLabel: string }[];
};

export type CourierJob = {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string | null;
  notes: string | null;
  zoneName: string;
  sizeName: string;
  isExpress: boolean;
  grossLabel: string | null;
  commissionLabel: string | null;
  netLabel: string | null;
  windowLabel: string | null;
};

export type WalletEntry = {
  id: string;
  title: string;
  detail: string;
  amountLabel: string;
  settled: boolean;
};

export type Me = {
  email: string;
  roles: string[];
  isAdmin: boolean;
  courier: {
    status: string;
    approved: boolean;
    canApply: boolean;
    vehicleType: string | null;
    activeZones: string[];
    rejectionReason: string | null;
  };
  wallet: {
    availableLabel: string;
    pendingLabel: string;
    commissionPctLabel: string;
    deliveredCount: number;
    entries: WalletEntry[];
  } | null;
};

export type JobAction = "accept" | "pick_up" | "start_transit" | "deliver" | "fail";

export const api = {
  me: () => request<Me>("/api/v1/me"),

  catalog: () =>
    request<{ zones: CatalogZone[]; sizeClasses: CatalogSize[] }>("/api/v1/catalog"),

  listShipments: () =>
    request<{ shipments: ShipmentSummary[] }>("/api/v1/shipments"),

  createShipment: (input: CreateShipmentInput) =>
    request<CreateShipmentResult>("/api/v1/shipments", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  shipmentDetail: (id: string) => request<ShipmentDetail>(`/api/v1/shipments/${id}`),

  shipmentAction: (id: string, action: "pay" | "cancel") =>
    request<{ status: string }>(`/api/v1/shipments/${id}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  listJobs: (mine = false) =>
    request<{ jobs: CourierJob[] }>(`/api/v1/jobs${mine ? "?mine=1" : ""}`),

  jobAction: (id: string, action: JobAction) =>
    request<{ status: string }>(`/api/v1/jobs/${id}`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  applyCourier: (input: {
    vehicleType: string;
    activeZones: string[];
    documentPaths: string[];
  }) =>
    request<{ status: string }>("/api/v1/courier/application", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
