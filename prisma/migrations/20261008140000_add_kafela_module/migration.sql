-- CreateEnum
CREATE TYPE "KafelaMemberRole" AS ENUM ('kafela_admin', 'group_admin', 'member');

-- CreateEnum
CREATE TYPE "KafelaMemberStatus" AS ENUM ('active', 'removed', 'left');

-- CreateEnum
CREATE TYPE "BroadcastPriority" AS ENUM ('info', 'urgent');

-- CreateTable
CREATE TABLE "kafelas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "join_code" TEXT NOT NULL,
    "max_members" INTEGER NOT NULL DEFAULT 150,
    "starts_on" DATE,
    "ends_on" DATE,
    "created_by_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kafelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kafela_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "role" "KafelaMemberRole" NOT NULL DEFAULT 'member',
    "group_id" TEXT,
    "status" "KafelaMemberStatus" NOT NULL DEFAULT 'active',
    "sharing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT,
    "phone" TEXT,
    "tent_or_room" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kafela_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kafela_groups" (
    "id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#0d9488',
    "admin_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kafela_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_locations" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "battery" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "group_id" TEXT,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "BroadcastPriority" NOT NULL DEFAULT 'info',
    "rally_lat" DECIMAL(10,8),
    "rally_lng" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_acks" (
    "id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_acks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_events" (
    "id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roll_calls" (
    "id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "group_id" TEXT,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "roll_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roll_call_responses" (
    "id" TEXT NOT NULL,
    "roll_call_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roll_call_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kafelas_join_code_key" ON "kafelas"("join_code");

-- CreateIndex
CREATE INDEX "kafelas_join_code_idx" ON "kafelas"("join_code");

-- CreateIndex
CREATE INDEX "kafelas_is_active_idx" ON "kafelas"("is_active");

-- CreateIndex
CREATE INDEX "kafela_members_kafela_id_status_idx" ON "kafela_members"("kafela_id", "status");

-- CreateIndex
CREATE INDEX "kafela_members_group_id_idx" ON "kafela_members"("group_id");

-- CreateIndex
CREATE INDEX "kafela_members_user_id_status_idx" ON "kafela_members"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kafela_members_user_id_kafela_id_key" ON "kafela_members"("user_id", "kafela_id");

-- CreateIndex
CREATE UNIQUE INDEX "kafela_groups_admin_member_id_key" ON "kafela_groups"("admin_member_id");

-- CreateIndex
CREATE INDEX "kafela_groups_kafela_id_idx" ON "kafela_groups"("kafela_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_locations_member_id_key" ON "member_locations"("member_id");

-- CreateIndex
CREATE INDEX "broadcasts_kafela_id_created_at_idx" ON "broadcasts"("kafela_id", "created_at");

-- CreateIndex
CREATE INDEX "broadcasts_group_id_idx" ON "broadcasts"("group_id");

-- CreateIndex
CREATE INDEX "broadcast_acks_member_id_idx" ON "broadcast_acks"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_acks_broadcast_id_member_id_key" ON "broadcast_acks"("broadcast_id", "member_id");

-- CreateIndex
CREATE INDEX "sos_events_kafela_id_resolved_at_idx" ON "sos_events"("kafela_id", "resolved_at");

-- CreateIndex
CREATE INDEX "sos_events_member_id_idx" ON "sos_events"("member_id");

-- CreateIndex
CREATE INDEX "roll_calls_kafela_id_created_at_idx" ON "roll_calls"("kafela_id", "created_at");

-- CreateIndex
CREATE INDEX "roll_call_responses_member_id_idx" ON "roll_call_responses"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "roll_call_responses_roll_call_id_member_id_key" ON "roll_call_responses"("roll_call_id", "member_id");

-- AddForeignKey
ALTER TABLE "kafelas" ADD CONSTRAINT "kafelas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_members" ADD CONSTRAINT "kafela_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_members" ADD CONSTRAINT "kafela_members_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_members" ADD CONSTRAINT "kafela_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "kafela_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_groups" ADD CONSTRAINT "kafela_groups_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kafela_groups" ADD CONSTRAINT "kafela_groups_admin_member_id_fkey" FOREIGN KEY ("admin_member_id") REFERENCES "kafela_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_locations" ADD CONSTRAINT "member_locations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "kafela_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_acks" ADD CONSTRAINT "broadcast_acks_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_acks" ADD CONSTRAINT "broadcast_acks_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "kafela_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_calls" ADD CONSTRAINT "roll_calls_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_calls" ADD CONSTRAINT "roll_calls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "kafela_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_calls" ADD CONSTRAINT "roll_calls_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_responses" ADD CONSTRAINT "roll_call_responses_roll_call_id_fkey" FOREIGN KEY ("roll_call_id") REFERENCES "roll_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_responses" ADD CONSTRAINT "roll_call_responses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
