"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReservationDetail } from "@/lib/types";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Package,
  Warehouse,
} from "lucide-react";

function useCountdown(expiresAt: string | null, status: string) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt || status !== "PENDING") return;

    const tick = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, diff));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  return secondsLeft;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200" },
  CONFIRMED: { label: "Confirmed", color: "text-green-600 bg-green-50 border-green-200" },
  RELEASED: { label: "Released", color: "text-gray-600 bg-gray-50 border-gray-200" },
} as const;

export function ReservationPageClient({ id }: { id: string }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"confirm" | "release" | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const secondsLeft = useCountdown(reservation?.expiresAt ?? null, reservation?.status ?? "");

  const fetchReservation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        setError("Reservation not found.");
        return;
      }
      const data = await res.json();
      setReservation(data);
      setError(null);
    } catch {
      setError("Could not load reservation.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReservation();

    // Poll every 5s to catch server-side expiry
    pollingRef.current = setInterval(fetchReservation, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchReservation]);

  // Stop polling when done
  useEffect(() => {
    if (reservation?.status === "CONFIRMED" || reservation?.status === "RELEASED") {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [reservation?.status]);

  const handleConfirm = async () => {
    setActionLoading("confirm");
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
      const data = await res.json();

      if (res.status === 410) {
        setActionError(`410 — ${data.error}`);
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        setActionError(data.error || "Failed to confirm.");
        return;
      }

      setReservation(data);
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async () => {
    setActionLoading("release");
    setActionError(null);
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to release.");
        return;
      }

      setReservation(data);
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading reservation...
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="flex flex-col items-center py-24 gap-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <p>{error ?? "Reservation not found."}</p>
        <Link href="/" className="text-sm text-indigo-600 underline">
          Back to products
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[reservation.status];
  const isPending = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  const isExpired = isPending && secondsLeft === 0;

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to products
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">#{reservation.id}</p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Product info */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{reservation.product.name}</p>
              <p className="text-xs text-gray-400 font-mono">{reservation.product.sku}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Qty: {reservation.quantity} ×{" "}
                <span className="font-medium text-gray-800">
                  ₹{reservation.product.price.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{reservation.warehouse.name}</p>
              <p className="text-xs text-gray-400">{reservation.warehouse.location}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Order total</span>
            <span className="text-xl font-bold text-indigo-600">
              ₹{(reservation.product.price * reservation.quantity).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Countdown / Status */}
        {isPending && (
          <div
            className={`mx-6 mb-5 rounded-lg px-4 py-3 flex items-center gap-3 ${
              isExpired || secondsLeft < 60
                ? "bg-red-50 border border-red-200"
                : "bg-amber-50 border border-amber-200"
            }`}
          >
            <Clock
              className={`w-5 h-5 shrink-0 ${
                isExpired || secondsLeft < 60 ? "text-red-500" : "text-amber-500"
              }`}
            />
            <div>
              {isExpired ? (
                <p className="text-sm font-semibold text-red-600">
                  Reservation expired — stock has been released.
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-700">
                    Reservation expires in{" "}
                    <span className="tabular-nums">{formatCountdown(secondsLeft)}</span>
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Complete your purchase before the timer runs out.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {isConfirmed && (
          <div className="mx-6 mb-5 rounded-lg px-4 py-3 flex items-center gap-3 bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">Order confirmed!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Confirmed at {new Date(reservation.confirmedAt!).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {isReleased && (
          <div className="mx-6 mb-5 rounded-lg px-4 py-3 flex items-center gap-3 bg-gray-50 border border-gray-200">
            <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-600">Reservation cancelled</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Stock has been returned to inventory.
              </p>
            </div>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mx-6 mb-4 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={!!actionLoading}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {actionLoading === "confirm" ? "Processing…" : "Confirm purchase"}
            </button>
            <button
              onClick={handleRelease}
              disabled={!!actionLoading}
              className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {actionLoading === "release" ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        )}

        {(isConfirmed || isReleased || isExpired) && (
          <div className="px-6 pb-6">
            <Link
              href="/"
              className="block w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm text-center hover:bg-indigo-700 transition-colors"
            >
              Browse more products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
