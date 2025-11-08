import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { filter, switchMap, take, timer, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { BookingService, CreateBookingRequest } from '../../services/booking.service';
import { BookingEventsService, BookingEvent } from '../../services/booking-events.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit, OnDestroy {
  carId: string | null = null;
  bookingData = {
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    vehicles: [{
      vehicleId: '',
      startDate: '',
      endDate: '',
      price: 0
    }],
    totalPrice: 0
  };
  car: any;
  isGuestBooking = false;
  isProcessing = false;
  private sseSub?: any;
  private pollSub?: Subscription;

  needsKyc = false;
  kycFiles: { driverLicense?: File; nationalId?: File; liveProfile?: File } = {};

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient,
    private bookingService: BookingService,
    public authService: AuthService,
    private usersService: UsersService,
    private router: Router,
    private bookingEvents: BookingEventsService,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('carId');
    if (this.carId) {
      this.http.get<any>(`http://localhost:3000/vehicles/${this.carId}`).subscribe(data => {
        this.car = data;
        this.bookingData.vehicles[0].vehicleId = this.carId!;
        this.bookingData.vehicles[0].price = data.pricePerDay;
        this.calculateTotalPrice();
      });
    }

    // If logged in, check KYC status
    if (this.authService.isAuthenticated()) {
      this.usersService.getMe().subscribe({
        next: (me) => {
          this.needsKyc = !(me.isKycVerified) || !((me.driverLicenseUrl) && (me.nationalIdUrl) && (me.liveProfileUrl));
        },
        error: () => {
          this.needsKyc = false;
        }
      });
    }
  }

  calculateTotalPrice() {
    if (this.bookingData.vehicles[0].startDate && this.bookingData.vehicles[0].endDate) {
      const startDate = new Date(this.bookingData.vehicles[0].startDate);
      const endDate = new Date(this.bookingData.vehicles[0].endDate);
      
      // Calculate the difference in days
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Calculate total price based on days and price per day
      this.bookingData.totalPrice = diffDays * this.bookingData.vehicles[0].price;
      
      console.log(`Booking for ${diffDays} days at $${this.bookingData.vehicles[0].price} per day = $${this.bookingData.totalPrice}`);
    }
  }

  getNumberOfDays(): number {
    if (this.bookingData.vehicles[0].startDate && this.bookingData.vehicles[0].endDate) {
      const startDate = new Date(this.bookingData.vehicles[0].startDate);
      const endDate = new Date(this.bookingData.vehicles[0].endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  }

  getFormattedTotalPrice(): string {
    return this.bookingData.totalPrice.toFixed(2);
  }

  onDateChange() {
    this.calculateTotalPrice();
  }

  onFileSelected(event: any, type: 'driverLicense' | 'nationalId' | 'liveProfile') {
    const file: File | undefined = event.target.files?.[0];
    if (file) this.kycFiles[type] = file;
  }

  book() {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      // If not authenticated, check if guest booking data is provided
      if (!this.bookingData.guestName || !this.bookingData.guestEmail || !this.bookingData.guestPhone) {
        alert('Please provide guest information or login to book a car');
        return;
      }
      this.isGuestBooking = true;
    }

    // Validate dates
    if (!this.bookingData.vehicles[0].startDate || !this.bookingData.vehicles[0].endDate) {
      alert('Please select start and end dates');
      return;
    }

    const startDate = new Date(this.bookingData.vehicles[0].startDate);
    const endDate = new Date(this.bookingData.vehicles[0].endDate);
    
    if (startDate >= endDate) {
      alert('End date must be after start date');
      return;
    }

    if (startDate < new Date()) {
      alert('Start date cannot be in the past');
      return;
    }

    // For guest bookings, we need to make a direct HTTP call with guest data
    if (this.isGuestBooking) {
      const guestBookingData = {
        guestName: this.bookingData.guestName,
        guestEmail: this.bookingData.guestEmail,
        guestPhone: this.bookingData.guestPhone,
        vehicles: [{
          vehicleId: this.bookingData.vehicles[0].vehicleId,
          startDate: new Date(this.bookingData.vehicles[0].startDate),
          endDate: new Date(this.bookingData.vehicles[0].endDate),
          price: this.bookingData.vehicles[0].price
        }],
        totalPrice: this.bookingData.totalPrice
      };

      this.isProcessing = true;
      this.http.post('http://localhost:3000/booking/guest', guestBookingData).subscribe({
        next: (res: any) => {
          const bookingId = res?.booking?.id;
          if (bookingId) this.trackBooking(bookingId, true);
        },
        error: (error) => {
          console.error('Guest booking error:', error);
          this.isProcessing = false;
          this.toastr.error('Error creating guest booking. Please try again.');
        }
      });
    } else {
      // For authenticated users, get the current user and use the booking service
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        alert('Please login to book a car');
        this.router.navigate(['/login']);
        return;
      }

      // If user needs KYC, ensure files are provided and submit first
      const requireKycNow = this.needsKyc;
      const hasAllKycFiles = !!(this.kycFiles.driverLicense && this.kycFiles.nationalId && this.kycFiles.liveProfile);
      if (requireKycNow) {
        if (!hasAllKycFiles) {
          alert('Please upload your driving license, national ID and a live profile photo before booking.');
          return;
        }
        // Submit KYC
        this.usersService.submitKyc({
          driverLicense: this.kycFiles.driverLicense!,
          nationalId: this.kycFiles.nationalId!,
          liveProfile: this.kycFiles.liveProfile!,
        }).subscribe({
          next: () => {
            this.needsKyc = false;
            alert('KYC submitted successfully. Your booking will remain pending until an admin approves your documents.');
            this.createAuthenticatedBooking(currentUser.id);
          },
          error: (err) => {
            console.error('KYC upload failed', err);
            alert('Failed to upload KYC documents. Please try again.');
          }
        });
        return;
      }

      const authenticatedBookingData = {
        userId: currentUser.id,
        vehicles: [{
          vehicleId: this.bookingData.vehicles[0].vehicleId,
          startDate: new Date(this.bookingData.vehicles[0].startDate),
          endDate: new Date(this.bookingData.vehicles[0].endDate),
          price: this.bookingData.vehicles[0].price
        }],
        totalPrice: this.bookingData.totalPrice
      };

      this.isProcessing = true;
      this.http.post('http://localhost:3000/booking', authenticatedBookingData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getToken()}`
        }
      }).subscribe({
        next: (res: any) => {
          const bookingId = res?.booking?.id;
          if (bookingId) this.trackBooking(bookingId, false);
        },
        error: (error) => {
          console.error('Booking error:', error);
          this.isProcessing = false;
          if (error.status === 400 && error.error?.code === 'KYC_REQUIRED') {
            this.needsKyc = true;
            this.toastr.warning('Please upload your driving license, national ID and a live profile photo to continue.');
            return;
          }
          if (error.status === 401) {
            this.toastr.error('Please login to book a car');
            this.router.navigate(['/login']);
          } else {
            this.toastr.error('Error creating booking. Please try again.');
          }
        }
      });
    }
  }
  ngOnDestroy() {
    this.sseSub?.unsubscribe?.();
    this.bookingEvents.disconnect();
    this.pollSub?.unsubscribe();
  }
  private trackBooking(bookingId: string, redirectHomeAfter?: boolean) {
    // SSE subscription (primary path)
    this.sseSub = this.bookingEvents.connect().subscribe((ev: any) => {
      const event: BookingEvent = ev;
      if (event?.type === 'booking_updated' && event?.payload?.id === bookingId) {
        this.sseSub?.unsubscribe?.();
        this.pollSub?.unsubscribe();
        this.isProcessing = false;
        if (event.payload.status === 'CONFIRMED') {
          this.toastr.success('Payment successful — booking confirmed.');
          this.router.navigate(['/customer-dashboard']);
        } else if (event.payload.status === 'REJECTED') {
          this.toastr.error('Payment cancelled — booking rejected.');
          if (redirectHomeAfter) this.router.navigate(['/']);
        }
      }
    });

    // Polling fallback (in case SSE misses)
    this.pollSub = timer(1000, 2000).pipe(
      switchMap(() => this.bookingService.getBookingById(bookingId)),
      filter((b: any) => b?.paymentStatus && b.paymentStatus !== 'PAYMENT_PENDING'),
      take(1),
    ).subscribe((b: any) => {
      this.sseSub?.unsubscribe?.();
      this.pollSub?.unsubscribe();
      this.isProcessing = false;
      if (b.paymentStatus === 'PAYMENT_SUCCESS' && (b.status === 'CONFIRMED' || b.status === 'PENDING')) {
        this.toastr.success('Payment successful — booking confirmed.');
        this.router.navigate(['/customer-dashboard']);
      } else {
        this.toastr.error('Payment cancelled — booking rejected.');
        if (redirectHomeAfter) this.router.navigate(['/']);
      }
    });
  }

  private createAuthenticatedBooking(userId: string) {
    const authenticatedBookingData = {
      userId,
      vehicles: [{
        vehicleId: this.bookingData.vehicles[0].vehicleId,
        startDate: new Date(this.bookingData.vehicles[0].startDate),
        endDate: new Date(this.bookingData.vehicles[0].endDate),
        price: this.bookingData.vehicles[0].price
      }],
      totalPrice: this.bookingData.totalPrice
    };

    this.http.post('http://localhost:3000/booking', authenticatedBookingData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    }).subscribe({
      next: (res) => {
        alert('Booking submitted! It will be approved after your documents are verified.');
        console.log('Booking created:', res);
        this.router.navigate(['/customer-dashboard']);
      },
      error: (error) => {
        console.error('Booking error:', error);
        alert('Error creating booking. Please try again.');
      }
    });
  }
}
