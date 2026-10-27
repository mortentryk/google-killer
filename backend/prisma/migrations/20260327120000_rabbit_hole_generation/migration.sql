-- CreateEnum
CREATE TYPE "RabbitHoleStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "RabbitHole" ADD COLUMN     "intentSignature" TEXT,
ADD COLUMN     "status" "RabbitHoleStatus" NOT NULL DEFAULT 'READY';

-- CreateIndex
CREATE UNIQUE INDEX "RabbitHole_intentSignature_key" ON "RabbitHole"("intentSignature");
