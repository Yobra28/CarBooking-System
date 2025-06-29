/*
  Warnings:

  - You are about to drop the column `state` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "state";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "name",
DROP COLUMN "state";
