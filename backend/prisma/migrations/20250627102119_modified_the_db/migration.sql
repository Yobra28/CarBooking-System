/*
  Warnings:

  - A unique constraint covering the columns `[color]` on the table `Vehicle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_color_key" ON "Vehicle"("color");
