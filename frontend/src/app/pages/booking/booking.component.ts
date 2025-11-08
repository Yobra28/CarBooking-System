import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, CreateBookingRequest } from '../../services/booking.service';
import { AuthService, User } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-booking',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
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

  needsKyc = false;
  kycFiles: { driverLicense?: File; nationalId?: File; liveProfile?: File } = {};

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient,
    private bookingService: BookingService,
    public authService: AuthService,
    private usersService: UsersService,
    private router: Router
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

      this.http.post('http://localhost:3000/booking/guest', guestBookingData).subscribe({
        next: (res) => {
          alert('Guest booking successful!');
          console.log('Guest booking created:', res);
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Guest booking error:', error);
          alert('Error creating guest booking. Please try again.');
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

      this.http.post('http://localhost:3000/booking', authenticatedBookingData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getToken()}`
        }
      }).subscribe({
        next: (res) => {
          alert('Booking successful!');
          console.log('Booking created:', res);
          this.router.navigate(['/customer-dashboard']);
        },
        error: (error) => {
          console.error('Booking error:', error);
          if (error.status === 400 && error.error?.code === 'KYC_REQUIRED') {
            this.needsKyc = true;
            alert('Please upload your driving license, national ID and a live profile photo to continue.');
            return;
          }
          if (error.status === 401) {
            alert('Please login to book a car');
            this.router.navigate(['/login']);
          } else {
            alert('Error creating booking. Please try again.');
          }
        }
      });
    }
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
