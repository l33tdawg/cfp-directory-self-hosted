-- AlterTable: Add job locking columns for concurrency safety
ALTER TABLE "plugin_jobs" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "plugin_jobs" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
ALTER TABLE "plugin_jobs" ADD COLUMN IF NOT EXISTS "lockTimeout" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "plugin_jobs" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex (drop first if exists to be idempotent)
DROP INDEX IF EXISTS "plugin_jobs_status_runAt_lockedAt_idx";
CREATE INDEX "plugin_jobs_status_runAt_lockedAt_idx" ON "plugin_jobs"("status", "runAt", "lockedAt");

DROP INDEX IF EXISTS "plugin_jobs_priority_runAt_idx";
CREATE INDEX "plugin_jobs_priority_runAt_idx" ON "plugin_jobs"("priority", "runAt");
