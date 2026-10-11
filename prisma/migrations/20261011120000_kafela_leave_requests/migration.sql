-- CreateEnum
CREATE TYPE "KafelaLeaveRequestStatus" AS ENUM ('pending', 'approved', 'denied', 'cancelled');

-- CreateTable
CREATE TABLE "kafela_leave_requests" (
    "id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "KafelaLeaveRequestStatus" NOT NULL DEFAULT 'pending',
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kafela_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kafela_leave_requests_kafela_id_status_idx" ON "kafela_leave_requests"("kafela_id", "status");

-- CreateIndex
CREATE INDEX "kafela_leave_requests_member_id_status_idx" ON "kafela_leave_requests"("member_id", "status");

-- One pending leave request per member
CREATE UNIQUE INDEX "kafela_leave_requests_member_id_pending_key" ON "kafela_leave_requests"("member_id") WHERE "status" = 'pending';

-- AddForeignKey
ALTER TABLE "kafela_leave_requests" ADD CONSTRAINT "kafela_leave_requests_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_leave_requests" ADD CONSTRAINT "kafela_leave_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_leave_requests" ADD CONSTRAINT "kafela_leave_requests_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "kafela_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
