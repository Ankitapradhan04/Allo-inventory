import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Idempotency key support (bonus)
  const idempotencyKey = request.headers.get("Idempotency-Key");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        return { error: "Reservation not found", status: 404 };
      }

      if (reservation.status === "CONFIRMED") {
        // Idempotent: already confirmed, return current state
        const full = await tx.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true },
        });
        return { data: full, status: 200 };
      }

      if (reservation.status === "RELEASED") {
        return { error: "Reservation has already been released.", status: 410 };
      }

      // Check expiry
      if (new Date() > reservation.expiresAt) {
        // Lazy cleanup: release the reservation
        await tx.reservation.update({
          where: { id },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
        // Return stock
        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
              "updatedAt" = NOW()
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;
        return { error: "Reservation has expired and stock has been released.", status: 410 };
      }

      // Confirm: move from reserved → confirmed (permanently decrement total)
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
            "totalUnits"    = GREATEST("totalUnits" - ${reservation.quantity}, 0),
            "updatedAt"     = NOW()
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      const confirmed = await tx.reservation.update({
        where: { id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
        include: { product: true, warehouse: true },
      });

      return { data: confirmed, status: 200 };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("POST /api/reservations/[id]/confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
