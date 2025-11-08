-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "mpesaCheckoutRequestId" TEXT,
ADD COLUMN     "mpesaMerchantRequestId" TEXT,
ADD COLUMN     "mpesaReceiptNumber" TEXT,
ADD COLUMN     "paymentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentCallbackRaw" JSONB,
ADD COLUMN     "paymentPhone" TEXT,
ADD COLUMN     "paymentResultCode" INTEGER,
ADD COLUMN     "paymentResultDesc" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
ADD COLUMN     "paymentUpdatedAt" TIMESTAMP(3);
