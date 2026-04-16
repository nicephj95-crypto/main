-- AlterEnum: Add SALES to UserRole
ALTER TYPE "UserRole" ADD VALUE 'SALES';

-- AlterTable: Add fields to Request
ALTER TABLE "Request" ADD COLUMN "targetCompanyName" TEXT;
ALTER TABLE "Request" ADD COLUMN "pickupNotify" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Request" ADD COLUMN "dropoffNotify" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" INTEGER,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
