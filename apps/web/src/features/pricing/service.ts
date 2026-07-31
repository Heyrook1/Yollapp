import { calculatePrice, type PriceBreakdown } from "@yolla/core";
import { prisma } from "@yolla/db";
import { NotFoundError, ValidationError, err, ok, type Result } from "@yolla/core";

export type PricingDb = {
  findActiveZone: (id: string) => Promise<{ id: string; baseFeeMinor: number; isActive: boolean } | null>;
  findActiveSizeClass: (
    id: string,
  ) => Promise<{ id: string; multiplier: number; isActive: boolean } | null>;
  getPlatformConfig: () => Promise<{
    commissionBps: number;
    expressPremiumBps: number;
  } | null>;
};

export const prismaPricingDb: PricingDb = {
  findActiveZone: (id) => prisma.zone.findUnique({ where: { id } }),
  findActiveSizeClass: (id) => prisma.sizeClass.findUnique({ where: { id } }),
  getPlatformConfig: () => prisma.platformConfig.findUnique({ where: { id: "default" } }),
};

export type QuoteParams = {
  zoneId: string;
  sizeClassId: string;
  isExpress: boolean;
};

export type QuoteResult = PriceBreakdown & {
  commissionBps: number;
  expressPremiumBps: number;
};

/**
 * Server-side price calculation. Never trust client-supplied amounts.
 */
export async function quotePrice(
  params: QuoteParams,
  db: PricingDb = prismaPricingDb,
): Promise<Result<QuoteResult>> {
  // Ignore any client price if present — params intentionally have no price field.
  const zone = await db.findActiveZone(params.zoneId);
  if (!zone || !zone.isActive) {
    return err(new NotFoundError("Zone not found"));
  }
  const size = await db.findActiveSizeClass(params.sizeClassId);
  if (!size || !size.isActive) {
    return err(new NotFoundError("Size class not found"));
  }
  const config = await db.getPlatformConfig();
  if (!config) {
    return err(new ValidationError("Platform config missing"));
  }

  const breakdown = calculatePrice({
    zoneBaseMinor: zone.baseFeeMinor,
    sizeMultiplier: size.multiplier,
    expressPremiumBps: config.expressPremiumBps,
    isExpress: params.isExpress,
  });

  return ok({
    ...breakdown,
    commissionBps: config.commissionBps,
    expressPremiumBps: config.expressPremiumBps,
  });
}
