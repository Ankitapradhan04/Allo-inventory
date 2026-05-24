export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  stockLevels: WarehouseStock[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface ReservationDetail {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}
