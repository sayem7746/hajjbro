-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "kafela_id" TEXT NOT NULL,
    "group_id" TEXT,
    "author_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "allow_multiple" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "closes_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_vote_choices" (
    "id" TEXT NOT NULL,
    "vote_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,

    CONSTRAINT "poll_vote_choices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "polls_kafela_id_created_at_idx" ON "polls"("kafela_id", "created_at");

-- CreateIndex
CREATE INDEX "polls_kafela_id_closed_at_idx" ON "polls"("kafela_id", "closed_at");

-- CreateIndex
CREATE INDEX "polls_group_id_idx" ON "polls"("group_id");

-- CreateIndex
CREATE INDEX "poll_options_poll_id_idx" ON "poll_options"("poll_id");

-- CreateIndex
CREATE INDEX "poll_votes_member_id_idx" ON "poll_votes"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_poll_id_member_id_key" ON "poll_votes"("poll_id", "member_id");

-- CreateIndex
CREATE INDEX "poll_vote_choices_option_id_idx" ON "poll_vote_choices"("option_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_vote_choices_vote_id_option_id_key" ON "poll_vote_choices"("vote_id", "option_id");

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_kafela_id_fkey" FOREIGN KEY ("kafela_id") REFERENCES "kafelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "kafela_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "kafela_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_vote_choices" ADD CONSTRAINT "poll_vote_choices_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "poll_votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_vote_choices" ADD CONSTRAINT "poll_vote_choices_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
