-- CreateEnum
CREATE TYPE "KafelaCompanionRelation" AS ENUM ('spouse', 'parent', 'child', 'other');

-- CreateTable
CREATE TABLE "kafela_companions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" "KafelaCompanionRelation" NOT NULL DEFAULT 'other',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kafela_companions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "roll_call_responses" ADD COLUMN "marked_by_id" TEXT;

-- CreateTable
CREATE TABLE "roll_call_companion_responses" (
    "id" TEXT NOT NULL,
    "roll_call_id" TEXT NOT NULL,
    "companion_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "marked_by_id" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roll_call_companion_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kafela_companions_member_id_idx" ON "kafela_companions"("member_id");

-- CreateIndex
CREATE INDEX "roll_call_responses_marked_by_id_idx" ON "roll_call_responses"("marked_by_id");

-- CreateIndex
CREATE INDEX "roll_call_companion_responses_companion_id_idx" ON "roll_call_companion_responses"("companion_id");

-- CreateIndex
CREATE INDEX "roll_call_companion_responses_marked_by_id_idx" ON "roll_call_companion_responses"("marked_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "roll_call_companion_responses_roll_call_id_companion_id_key" ON "roll_call_companion_responses"("roll_call_id", "companion_id");

-- AddForeignKey
ALTER TABLE "kafela_companions" ADD CONSTRAINT "kafela_companions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_responses" ADD CONSTRAINT "roll_call_responses_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "kafela_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_companion_responses" ADD CONSTRAINT "roll_call_companion_responses_roll_call_id_fkey" FOREIGN KEY ("roll_call_id") REFERENCES "roll_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_companion_responses" ADD CONSTRAINT "roll_call_companion_responses_companion_id_fkey" FOREIGN KEY ("companion_id") REFERENCES "kafela_companions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roll_call_companion_responses" ADD CONSTRAINT "roll_call_companion_responses_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "kafela_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
