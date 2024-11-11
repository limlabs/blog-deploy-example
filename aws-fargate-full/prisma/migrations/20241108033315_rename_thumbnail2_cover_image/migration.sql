/*
  Warnings:

  - You are about to drop the column `thumbnailUrl` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "thumbnailUrl",
ADD COLUMN     "coverImageUrl" TEXT;
