-- AddColumn
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "externalEstimatedPrice" INTEGER;
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "externalSentPrice" INTEGER;
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "externalPlatform" TEXT;
