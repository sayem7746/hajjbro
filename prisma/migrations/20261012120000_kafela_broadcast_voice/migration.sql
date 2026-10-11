-- AlterTable
ALTER TABLE "broadcasts" ADD COLUMN "audio_path" TEXT;
ALTER TABLE "broadcasts" ADD COLUMN "audio_mime" TEXT;
ALTER TABLE "broadcasts" ADD COLUMN "audio_duration_ms" INTEGER;
