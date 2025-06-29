/*
  Warnings:

  - You are about to drop the column `available` on the `Vehicle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "available",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;
