import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create warehouses
  const warehouseMumbai = await prisma.warehouse.upsert({
    where: { id: "wh-mumbai" },
    update: {},
    create: {
      id: "wh-mumbai",
      name: "Mumbai Central",
      location: "Mumbai, Maharashtra",
    },
  });

  const warehouseDelhi = await prisma.warehouse.upsert({
    where: { id: "wh-delhi" },
    update: {},
    create: {
      id: "wh-delhi",
      name: "Delhi North",
      location: "Delhi, NCR",
    },
  });

  const warehouseBangalore = await prisma.warehouse.upsert({
    where: { id: "wh-bangalore" },
    update: {},
    create: {
      id: "wh-bangalore",
      name: "Bangalore Tech Park",
      location: "Bangalore, Karnataka",
    },
  });

  console.log("Warehouses created.");

  // Create products
  const products = [
    {
      id: "prod-001",
      name: "Wireless Noise-Cancelling Headphones",
      sku: "SKU-WNC-001",
      description: "Premium over-ear headphones with 30hr battery life",
      price: 8999,
    },
    {
      id: "prod-002",
      name: "Mechanical Keyboard TKL",
      sku: "SKU-MKB-002",
      description: "Tenkeyless mechanical keyboard with RGB backlight",
      price: 5499,
    },
    {
      id: "prod-003",
      name: "4K USB-C Monitor 27\"",
      sku: "SKU-MON-003",
      description: "27-inch 4K IPS display with USB-C connectivity",
      price: 32999,
    },
    {
      id: "prod-004",
      name: "Ergonomic Office Chair",
      sku: "SKU-CHR-004",
      description: "Lumbar support, adjustable armrests, mesh back",
      price: 18999,
    },
    {
      id: "prod-005",
      name: "Portable SSD 1TB",
      sku: "SKU-SSD-005",
      description: "NVMe speed in a pocket-sized form factor",
      price: 6999,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  console.log("Products created.");

  // Create stock levels
  const stockData = [
    // Mumbai
    { productId: "prod-001", warehouseId: "wh-mumbai", totalUnits: 10 },
    { productId: "prod-002", warehouseId: "wh-mumbai", totalUnits: 5 },
    { productId: "prod-003", warehouseId: "wh-mumbai", totalUnits: 3 },
    { productId: "prod-004", warehouseId: "wh-mumbai", totalUnits: 2 },
    { productId: "prod-005", warehouseId: "wh-mumbai", totalUnits: 20 },
    // Delhi
    { productId: "prod-001", warehouseId: "wh-delhi", totalUnits: 7 },
    { productId: "prod-002", warehouseId: "wh-delhi", totalUnits: 12 },
    { productId: "prod-003", warehouseId: "wh-delhi", totalUnits: 1 },
    { productId: "prod-004", warehouseId: "wh-delhi", totalUnits: 4 },
    { productId: "prod-005", warehouseId: "wh-delhi", totalUnits: 0 },
    // Bangalore
    { productId: "prod-001", warehouseId: "wh-bangalore", totalUnits: 15 },
    { productId: "prod-002", warehouseId: "wh-bangalore", totalUnits: 8 },
    { productId: "prod-003", warehouseId: "wh-bangalore", totalUnits: 6 },
    { productId: "prod-004", warehouseId: "wh-bangalore", totalUnits: 3 },
    { productId: "prod-005", warehouseId: "wh-bangalore", totalUnits: 25 },
  ];

  for (const stock of stockData) {
    await prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: stock.productId,
          warehouseId: stock.warehouseId,
        },
      },
      update: {},
      create: { ...stock, reservedUnits: 0 },
    });
  }

  console.log("Stock levels created.");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
