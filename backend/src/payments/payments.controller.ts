/* eslint-disable prettier/prettier */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiateStkDto } from './dto/initiate-stk.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('stk-push')
  @HttpCode(HttpStatus.ACCEPTED)
  async stkPush(@Body() body: InitiateStkDto) {
    return this.payments.initiateStkPush({
      bookingId: body.bookingId,
      phone: body.phone,
      amount: body.amount,
    });
  }

  // Safaricom will POST callback to this endpoint (configure MPESA_CALLBACK_URL to this route)
  @Post('mpesa/callback')
  @HttpCode(HttpStatus.OK)
  async mpesaCallback(@Body() payload: any) {
    return this.payments.handleCallback(payload);
  }
}