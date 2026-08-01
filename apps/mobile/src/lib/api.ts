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

export const api = {
  catalog: () =>
    request<{ zones: CatalogZone[]; sizeClasses: CatalogSize[] }>("/api/v1/catalog"),

  listShipments: () =>
    request<{ shipments: ShipmentSummary[] }>("/api/v1/shipments"),

  createShipment: (input: CreateShipmentInput) =>
    request<CreateShipmentResult>("/api/v1/shipments", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
