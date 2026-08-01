import { NextResponse } from "next/server";
import { AppRole, CourierStatus, prisma } from "@yolla/db";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { queryCourierWallet } from "@/features/shipments/queries";
import { isApprovedCourier } from "@/lib/authz";

export const dynamic = "force-dynamic";

/**
 * Oturum özeti: yetenekler ve (onaylıysa) kurye cüzdanı.
 * Mobil, sekmeleri buna göre gösterir — ancak yetki her uçta ayrıca doğrulanır.
 */
export async function GET(request: Request) {
  try {
    const session = await authenticateRequest(request);

    const profile = await prisma.courierProfile.findUnique({
      where: { userId: session.dbUser.id },
      select: { status: true, vehicleType: true, activeZones: true, rejectionReason: true },
    });

    const state = {
      user: session.dbUser,
      courierStatus: profile?.status ?? null,
    };
    const courierApproved = isApprovedCourier(state);

    const wallet = courierApproved
      ? await queryCourierWallet(session.dbUser.id)
      : null;

    return NextResponse.json({
      email: session.email,
      roles: session.dbUser.roles,
      isAdmin: session.dbUser.roles.includes(AppRole.ADMIN),
      courier: {
        status: profile?.status ?? "NOT_APPLIED",
        approved: courierApproved,
        canApply:
          profile?.status !== CourierStatus.SUSPENDED &&
          profile?.status !== CourierStatus.DISABLED,
        vehicleType: profile?.vehicleType ?? null,
        activeZones: profile?.activeZones ?? [],
        rejectionReason: profile?.rejectionReason ?? null,
      },
      wallet: wallet
        ? {
            availableLabel: wallet.availableLabel,
            pendingLabel: wallet.pendingLabel,
            commissionPctLabel: wallet.commissionPctLabel,
            deliveredCount: wallet.deliveredCount,
            entries: wallet.entries.map((e) => ({
              id: e.id,
              title: e.title,
              detail: e.detail,
              amountLabel: e.amountLabel,
              settled: e.settled,
            })),
          }
        : null,
    });
  } catch (error) {
    return toApiResponse(error);
  }
}
