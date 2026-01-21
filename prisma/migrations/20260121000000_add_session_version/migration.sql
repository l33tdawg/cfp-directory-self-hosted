-- AlterTable: Add sessionVersion to User for JWT session invalidation
-- When a user's role is changed, sessionVersion is incremented to force re-authentication
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
