-- CreateEnum
CREATE TYPE "ScheduledNotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "scheduled_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "last_attempt_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_notifications_status_scheduled_at_idx" ON "scheduled_notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "scheduled_notifications_user_id_idx" ON "scheduled_notifications"("user_id");

-- AddForeignKey
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
