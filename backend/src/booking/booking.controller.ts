/* eslint-disable prettier/prettier */
import { Controller, Post, Get, Body, Param, Patch, Delete, UseGuards, Sse, MessageEvent } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BookingEventsService } from './booking.events.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService, private readonly bookingEvents: BookingEventsService) {}

  @Post('guest')
  async createGuestBooking(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT', 'CUSTOMER')
  async createBooking(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT')
  async getAllBookings() {
    return this.bookingService.findAll();
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT', 'CUSTOMER')
  async getBookingsByUser(@Param('userId') userId: string) {
    return this.bookingService.findByUser(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getBookingById(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT')
  async updateBooking(@Param('id') id: string, @Body() updateData: any) {
    return this.bookingService.update(id, updateData);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT', 'CUSTOMER')
  async cancelBooking(@Param('id') id: string) {
    return this.bookingService.cancelBooking(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteBooking(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }

  // Server-Sent Events stream for booking status updates
  @Get('events')
  @Sse()
  events(): Observable<MessageEvent> {
    return this.bookingEvents.asObservable().pipe(
      map((e) => ({ data: e }))
    );
  }
}
