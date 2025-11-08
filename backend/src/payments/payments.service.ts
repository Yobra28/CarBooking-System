/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { BookingEventsService } from '../booking/booking.events.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly events: BookingEventsService,
  ) {}

  private baseUrl() {
    const env = this.config.get<string>('MPESA_ENV') || 'sandbox';
    return env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    const key = this.config.get<string>('MPESA_CONSUMER_KEY');
    const secret = this.config.get<string>('MPESA_CONSUMER_SECRET');
    if (!key || !secret) throw new InternalServerErrorException('M-Pesa keys not configured');

    const tokenUrl = `${this.baseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const { data } = await axios.get(tokenUrl, {
      headers: { Authorization: `Basic ${auth}` },
      timeout: 10000,
    });
    return data.access_token as string;
  }

  private yyyymmddhhmmss(date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${y}${m}${d}${h}${mi}${s}`;
  }

  private password(shortCode: string, passkey: string, timestamp: string) {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  }

  async initiateStkPush(params: { bookingId: string; phone: string; amount?: number; accountReference?: string; transactionDesc?: string; }) {
    const { bookingId } = params;
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new InternalServerErrorException('Booking not found');

    const amount = params.amount ?? Math.ceil(booking.totalPrice);
    const phone = params.phone;

    const shortCode = this.config.get<string>('MPESA_SHORT_CODE');
    const passkey = this.config.get<string>('MPESA_PASSKEY');
    const callbackUrl = this.config.get<string>('MPESA_CALLBACK_URL');
    if (!shortCode || !passkey || !callbackUrl) {
      throw new InternalServerErrorException('M-Pesa config missing (short code, passkey, callback)');
    }

    // Prepare security values
    const timestamp = this.yyyymmddhhmmss();
    const password = this.password(shortCode, passkey, timestamp);
    const token = await this.getAccessToken();

    // Update booking with pending payment info
    await this.prisma.booking.update({
      where: { id: bookingId },
      // Cast to any until prisma generate is run
      data: {
        paymentStatus: 'PAYMENT_PENDING',
        paymentPhone: phone,
        paymentAmount: amount,
        paymentUpdatedAt: new Date(),
      } as any,
    });

    const url = `${this.baseUrl()}/mpesa/stkpush/v1/processrequest`;
    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: params.accountReference ?? bookingId,
      TransactionDesc: params.transactionDesc ?? 'Car rental booking',
    };

    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    // Save request IDs
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        mpesaMerchantRequestId: data.MerchantRequestID ?? null,
        mpesaCheckoutRequestId: data.CheckoutRequestID ?? null,
        paymentUpdatedAt: new Date(),
      } as any,
    });

    return {
      message: 'STK push initiated',
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage,
    };
  }

  // Safaricom callback handler
  async handleCallback(body: any) {
    try {
      const callback = body?.Body?.stkCallback;
      if (!callback) return { ok: true };

      const checkoutRequestId: string | undefined = callback.CheckoutRequestID;
      const merchantRequestId: string | undefined = callback.MerchantRequestID;
      const resultCode: number = callback.ResultCode;
      const resultDesc: string = callback.ResultDesc;

      // Find booking by checkout or merchant ID
      const booking = await this.prisma.booking.findFirst({
        where: {
          OR: [
            { mpesaCheckoutRequestId: checkoutRequestId },
            { mpesaMerchantRequestId: merchantRequestId },
          ],
        } as any,
      });

      if (!booking) {
        this.logger.warn(`Callback received but booking not found for CheckoutRequestID=${checkoutRequestId}`);
        return { ok: true };
      }

      // Extract receipt number and amount/phone
      let receipt: string | undefined;
      let amount: number | undefined;
      let phone: string | undefined;
      const items = callback?.CallbackMetadata?.Item ?? [];
      for (const it of items) {
        if (it.Name === 'MpesaReceiptNumber') receipt = it.Value as string;
        if (it.Name === 'Amount') amount = Number(it.Value);
        if (it.Name === 'PhoneNumber') phone = String(it.Value);
      }

      const success = resultCode === 0;

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
          paymentResultCode: resultCode,
          paymentResultDesc: resultDesc,
          mpesaReceiptNumber: receipt ?? null,
          paymentAmount: amount ?? undefined,
          paymentPhone: phone ?? undefined,
          paymentCallbackRaw: callback as any,
          paymentUpdatedAt: new Date(),
        } as any,
      });

      // On success, confirm and credit revenue idempotently
      if (success) {
        const full = await this.prisma.booking.findUnique({
          where: { id: booking.id },
          include: { user: { select: { id: true, isKycVerified: true } } },
        });

        // Credit totalSpent once using revenueCredited flag
        if (full?.user?.id && !(full as any).revenueCredited) {
          try {
            await this.prisma.$transaction([
              this.prisma.user.update({
                where: { id: full.user.id },
                data: { totalSpent: { increment: amount ?? full.totalPrice } } as any,
              }),
              this.prisma.booking.update({
                where: { id: booking.id },
                data: { revenueCredited: true } as any,
              }),
            ]);
          } catch (e) {
            this.logger.error('Failed to credit revenue (might already be credited):', e as any);
          }
        }

        // Confirm booking upon successful payment
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED', confirmedAt: new Date() },
        });
        // Read updated booking
        const b = await this.prisma.booking.findUnique({
          where: { id: booking.id },
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            bookingItems: true,
          },
        });
        // Publish booking_updated event so UI can show success message
        this.events.publish({ type: 'booking_updated', payload: { ...b, message: 'Payment successful. Booking confirmed.' } });
        // Send confirmation email to customer (user or guest)
        try {
          const customerEmail = b?.user?.email ?? (b as any)?.guestEmail;
          const customerName = b?.user ? `${b.user.firstName} ${b.user.lastName}`.trim() : (b as any)?.guestName ?? 'Valued Customer';
          if (customerEmail) {
            void this.emailService.sendBookingConfirmationEmail(customerEmail, customerName, {
              id: b?.id,
              startDate: b?.bookingItems[0]?.startDate,
              endDate: b?.bookingItems[0]?.endDate,
              totalPrice: b?.totalPrice,
              status: b?.status,
            }).catch((e) => this.logger.error('Failed to send confirmation email from callback', e as any));
          }
        } catch (e) {
          this.logger.error('Callback: failed to queue confirmation email', e as any);
        }
      } else {
        // Explicit failure (including user cancellation) => reject booking
        const rej = await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'REJECTED' } as any,
        });
        // Publish booking_updated failure event
        this.events.publish({ type: 'booking_updated', payload: { ...rej, message: 'Payment failed or cancelled. Booking rejected.' } });
      }

      return { ok: true };
    } catch (e) {
      this.logger.error('Failed handling M-Pesa callback', e as any);
      return { ok: false };
    }
  }
  // Poll for short period by default (5s total, 1s interval)
  async waitForPayment(bookingId: string, timeoutMs = 5000, intervalMs = 1000): Promise<{ success: boolean; timeout?: boolean; booking?: any; }>{
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const b = await this.prisma.booking.findUnique({ where: { id: bookingId } }) as any;
      if (!b) return { success: false };
      if (b.paymentStatus && b.paymentStatus !== 'PAYMENT_PENDING') {
        return { success: b.paymentStatus === 'PAYMENT_SUCCESS', booking: b };
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { success: false, timeout: true };
  }
}
