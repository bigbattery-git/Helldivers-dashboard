-- AlterTable
ALTER TABLE "assignment" ADD COLUMN     "briefing_ko" TEXT,
ADD COLUMN     "title_ko" TEXT,
ADD COLUMN     "translation" TEXT;

-- AlterTable
ALTER TABLE "news_item" ADD COLUMN     "translation" TEXT;
