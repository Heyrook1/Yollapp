import { NextResponse } from "next/server";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { listSenderShipments } from "@/features/shipments/service";
import { querySenderWalletFor } from "@/features/shipments/queries";

export const dynamic = "force-dynamic";

/**
 * İşletme özeti — GERÇEK verilerden türetilir (kullanıcının kendi gönderileri).
 *
 * Toplu içe aktarma, ekip üyeleri ve fatura henüz YOK; bu uç onları uydurmaz,
 * yalnızca mevcut gerçek sayıları döner.
 */
export async function GET(request: Request) {
  try {
    const session = await authenticateRequest(request);

    const [shipments, wallet] = await Promise.all([
      listSenderShipments(session.dbUser.id),
      querySenderWalletFor(session.dbUser.id),
    ]);

    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;
    const active = shipments.filter((s) =>
      ["QUOTED", "PAID", "MATCHED", "PICKED_UP", "IN_TRANSIT"].includes(s.status),
    ).length;

    return NextResponse.json({
      totalShipments: shipments.length,
      delivered,
      active,
      totalSpentLabel: wallet.totalLabel,
      paidCount: wallet.count,
    });
  } catch (error) {
    return toApiResponse(error);
  }
}
