import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, NotFoundError } from "@yolla/core";
import { prisma } from "@yolla/db";
import { authenticateRequest, toApiResponse } from "@/lib/api-auth";
import { getLiveLocationForShipment } from "@/features/maps/location-service";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

/** Auth'lı canlı konum — sender veya atanmış kurye. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await authenticateRequest(request);
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Gönderi bulunamadı." }, { status: 404 });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        courierId: true,
        status: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        priceQuote: {
          select: {
            routePolyline: true,
            routeDistanceMeters: true,
            routeDurationSeconds: true,
          },
        },
      },
    });
    if (!shipment) throw new NotFoundError("Gönderi bulunamadı.");

    const isOwner = shipment.senderId === session.dbUser.id;
    const isCourier = shipment.courierId === session.dbUser.id;
    const isAdmin = session.dbUser.roles.includes("ADMIN");
    if (!isOwner && !isCourier && !isAdmin) {
      throw new ForbiddenError("Bu gönderiye erişim yok.");
    }

    const live = await getLiveLocationForShipment(id);
    return NextResponse.json({
      shipmentId: id,
      status: shipment.status,
      pickup: shipment.pickupLat != null && shipment.pickupLng != null
        ? { lat: shipment.pickupLat, lng: shipment.pickupLng }
        : null,
      dropoff:
        shipment.dropoffLat != null && shipment.dropoffLng != null
          ? { lat: shipment.dropoffLat, lng: shipment.dropoffLng }
          : null,
      routePolyline: shipment.priceQuote?.routePolyline ?? null,
      routeDistanceMeters: shipment.priceQuote?.routeDistanceMeters ?? null,
      routeDurationSeconds: shipment.priceQuote?.routeDurationSeconds ?? null,
      live,
    });
  } catch (error) {
    return toApiResponse(error);
  }
}
