-- CreateTable
CREATE TABLE "LowStockAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "alertedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "LowStockAlert_shop_inventoryItemId_key" ON "LowStockAlert"("shop", "inventoryItemId");
