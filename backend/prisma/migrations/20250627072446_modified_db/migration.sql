/*
  Warnings:

  - You are about to drop the column `description` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `address` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postalCode` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_locationId_fkey";

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "description",
DROP COLUMN "locationId",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "postalCode" TEXT NOT NULL;

-- DropTable
DROP TABLE "Location";
