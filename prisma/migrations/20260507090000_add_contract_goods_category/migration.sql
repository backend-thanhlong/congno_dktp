-- CreateEnum
CREATE TYPE "GoodsCategoryType" AS ENUM ('MEDICINE', 'SUPPLY');

-- CreateTable
CREATE TABLE "ContractGoodsCategory" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "GoodsCategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractGoodsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "drugName" TEXT NOT NULL,
    "activeIngredient" TEXT NOT NULL,
    "concentration" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "goodsName" TEXT NOT NULL,
    "technicalRequirement" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractGoodsCategory_contractId_key" ON "ContractGoodsCategory"("contractId");

-- CreateIndex
CREATE INDEX "MedicineItem_categoryId_orderNumber_idx" ON "MedicineItem"("categoryId", "orderNumber");

-- CreateIndex
CREATE INDEX "SupplyItem_categoryId_orderNumber_idx" ON "SupplyItem"("categoryId", "orderNumber");

-- AddForeignKey
ALTER TABLE "ContractGoodsCategory" ADD CONSTRAINT "ContractGoodsCategory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineItem" ADD CONSTRAINT "MedicineItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContractGoodsCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyItem" ADD CONSTRAINT "SupplyItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContractGoodsCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
