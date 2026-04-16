-- AlterTable: RequestDriverAssignment에 추가 배차정보 필드 추가
ALTER TABLE "RequestDriverAssignment" ADD COLUMN "extraFare" INTEGER;
ALTER TABLE "RequestDriverAssignment" ADD COLUMN "extraFareReason" TEXT;
ALTER TABLE "RequestDriverAssignment" ADD COLUMN "codRevenue" INTEGER;
ALTER TABLE "RequestDriverAssignment" ADD COLUMN "customerMemo" TEXT;
ALTER TABLE "RequestDriverAssignment" ADD COLUMN "internalMemo" TEXT;
