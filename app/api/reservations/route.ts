import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateReservationSchema } from "@/lib/schemas";

const RESERVATION_TTL_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // Idempotency key support (bonus)
    const idempotencyKey = request.headers.get("Idempotency-Key");

    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
        include: { product: true, warehouse: true },
      });
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    // Use a serializable transaction with raw SQL to atomically check & decrement.
    // This is the core concurrency-safe operation:
    // We update the StockLevel row only if available units >= requested quantity.
    // The WHERE clause on the UPDATE acts as an atomic compare-and-set at the DB level.
    const result = await prisma.$transaction(async (tx) => {
      // Attempt atomic decrement: only succeeds if availableUnits >= quantity
      const updated = await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "reservedUnits" = "reservedUnits" + ${quantity},
            "updatedAt" = NOW()
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
          AND ("totalUnits" - "reservedUnits") >= ${quantity}
      `;

      if (updated === 0) {
        // Either stock level doesn't exist or insufficient stock
        return null;
      }

      // Stock was reserved — create the reservation record
      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey: idempotencyKey ?? undefined,
        },
        include: { product: true, warehouse: true },
      });

      return reservation;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Not enough stock available for this product/warehouse combination." },
        { status: 409 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/reservations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: { product: true, warehouse: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
