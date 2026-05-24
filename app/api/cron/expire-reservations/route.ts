import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This route is called by Vercel Cron every minute.
// It finds all PENDING reservations past their expiresAt and releases them.
export async function GET(request: NextRequest) {
  // Protect cron endpoint
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all expired pending reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0 });
    }

    // Release each in a transaction
    let releasedCount = 0;
    for (const reservation of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
              "updatedAt"     = NOW()
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "RELEASED", releasedAt: now },
        });
      });
      releasedCount++;
    }

    console.log(`Cron: Released ${releasedCount} expired reservations.`);
    return NextResponse.json({ released: releasedCount });
  } catch (error) {
    console.error("Cron expire-reservations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
