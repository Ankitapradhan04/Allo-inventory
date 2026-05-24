"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProductWithStock } from "@/lib/types";
import { Warehouse, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

export function ProductsPageClient() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingKey, setReservingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
      setError(null);
    } catch {
      setError("Could not load products. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleReserve = async (productId: string, warehouseId: string, productName: string) => {
    const key = `${productId}-${warehouseId}`;
    setReservingKey(key);
    setApiError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setApiError(`Not enough stock: ${data.error}`);
        return;
      }

      if (!res.ok) {
        setApiError(data.error || "Something went wrong.");
        return;
      }

      setSuccessMsg(`Reserved "${productName}". Redirecting to checkout...`);
      setTimeout(() => {
        router.push(`/reservations/${data.id}`);
      }, 800);
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setReservingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-24 gap-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <p>{error}</p>
        <button onClick={fetchProducts} className="text-sm text-indigo-600 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Select a product and warehouse to reserve stock.</p>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {apiError && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {apiError}
        </div>
      )}

      <div className="grid gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">{product.name}</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</p>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-bold text-indigo-600">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5" /> Warehouse Stock
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {product.stockLevels.map((sl) => {
                  const available = sl.availableUnits;
                  const isOutOfStock = available <= 0;
                  const key = `${product.id}-${sl.warehouseId}`;
                  const isReserving = reservingKey === key;

                  return (
                    <div
                      key={sl.warehouseId}
                      className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
                        isOutOfStock
                          ? "bg-gray-50 border-gray-200 opacity-60"
                          : "bg-indigo-50/40 border-indigo-100"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {sl.warehouseName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{sl.warehouseLocation}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-semibold ${
                              isOutOfStock ? "text-gray-400" : "text-green-600"
                            }`}
                          >
                            {isOutOfStock ? "Out of stock" : `${available} available`}
                          </span>
                          {sl.reservedUnits > 0 && (
                            <span className="text-xs text-amber-500">
                              ({sl.reservedUnits} reserved)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleReserve(product.id, sl.warehouseId, product.name)
                        }
                        disabled={isOutOfStock || isReserving}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isOutOfStock
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : isReserving
                            ? "bg-indigo-400 text-white cursor-wait"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                        }`}
                      >
                        {isReserving ? "Reserving…" : "Reserve"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
