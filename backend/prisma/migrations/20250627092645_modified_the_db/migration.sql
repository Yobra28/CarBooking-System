/*
  Warnings:

  - You are about to drop the column `doors` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `seats` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Vehicle` table. All the data in the column will be lost.
  - Added the required column `total` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "doors",
DROP COLUMN "seats",
DROP COLUMN "year",
ADD COLUMN     "total" INTEGER NOT NULL;
