import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });

      if (!reservation) {
        return { error: "Reservation not found", status: 404 };
      }

      if (reservation.status === "RELEASED") {
        // Idempotent
        const full = await tx.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true },
        });
        return { data: full, status: 200 };
      }

      if (reservation.status === "CONFIRMED") {
        return { error: "Cannot release a confirmed reservation.", status: 409 };
      }

      // Release: return units back to available pool
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
            "updatedAt"     = NOW()
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      const released = await tx.reservation.update({
        where: { id },
        data: { status: "RELEASED", releasedAt: new Date() },
        include: { product: true, warehouse: true },
      });

      return { data: released, status: 200 };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("POST /api/reservations/[id]/release error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
