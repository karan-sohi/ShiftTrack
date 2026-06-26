-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "shiftPremiumRate" DECIMAL(6,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShiftLog" ADD COLUMN     "premiumPay" DECIMAL(8,2) NOT NULL DEFAULT 0;
