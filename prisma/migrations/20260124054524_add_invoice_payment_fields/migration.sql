-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paidAmount" DECIMAL(18,2),
ADD COLUMN     "paymentDate" TIMESTAMP(3);
