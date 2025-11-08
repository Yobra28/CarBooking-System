import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../services/booking.service';
import { BookingEventsService } from '../../services/booking-events.service';
import { AuthService, User } from '../../services/auth.service';
import { ReviewService, Review } from '../../services/review.service';
import { UsersService } from '../../services/users.service';

interface DashboardStats {
  totalRentals: number;
  completedRentals: number;
  averageRating: number;
  totalSpent: number;
  upcomingRentals: number;
}

interface RentalHistory {
  id: string;
  vehicleName: string;
  vehicleImage: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  status: string;
  rating?: number;
  review?: string;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.css']
})
export class CustomerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  bookings: Booking[] = [];
  userReviews: Review[] = [];
  dashboardStats: DashboardStats = {
    totalRentals: 0,
    completedRentals: 0,
    averageRating: 0,
    totalSpent: 0,
    upcomingRentals: 0
  };
  
  // UI State
  activeTab: 'overview' | 'upcoming' | 'history' | 'profile' = 'overview';
  showRentalModal = false;
  selectedRental: RentalHistory | null = null;

  // Profile edit state
  editProfile = false;
  profile: { firstName: string; lastName: string; email: string; phone?: string } = { firstName: '', lastName: '', email: '', phone: '' };

  // Rules modal state
  showRulesModal = false;
  
  // Loading states
  isLoading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private bookingService: BookingService,
    private bookingEvents: BookingEventsService,
    private authService: AuthService,
    private reviewService: ReviewService,
    private usersService: UsersService,
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadData();
    this.loadProfile();

    // Subscribe to booking events for real-time updates
    this.bookingEvents.connect().subscribe(ev => {
      if (ev.type === 'booking_updated' || ev.type === 'booking_cancelled' || ev.type === 'booking_created') {
        this.loadData();
      }
    });

  }

  loadData() {
    this.isLoading = true;
    
    if (!this.currentUser) {
      console.error('No current user found');
      this.isLoading = false;
      return;
    }
    
    console.log('Loading bookings for user:', this.currentUser.id);
    
    // Load bookings for the current user only
    this.bookingService.getBookingsByUser(this.currentUser.id).subscribe({
      next: (bookings) => {
        console.log('Received bookings:', bookings);
        this.bookings = bookings;
        this.loadUserReviews();
      },
      error: (error) => {
        console.error('Failed to load bookings:', error);
        this.showMessage('Failed to load booking history', 'error');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadUserReviews() {
    if (!this.currentUser) {
      this.updateDashboardStats();
      return;
    }
    
    // Get reviews for the current user
    this.reviewService.getUserReviews(this.currentUser.id).subscribe({
      next: (reviews) => {
        this.userReviews = reviews;
        this.updateDashboardStats();
      },
      error: (error) => {
        console.error('Failed to load reviews:', error);
        this.updateDashboardStats(); // Continue with booking data even if reviews fail
      }
    });
  }

  updateDashboardStats() {
    const completedBookings = this.bookings.filter(b => b.status === 'COMPLETED');
    const confirmedBookings = this.bookings.filter(b => b.status === 'CONFIRMED');
    const pendingBookings = this.bookings.filter(b => b.status === 'PENDING');
    const cancelledBookings = this.bookings.filter(b => b.status === 'CANCELLED');
    
    // Calculate total spent from completed (and optionally confirmed) bookings only
    const totalSpent = this.bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    // Calculate average rating from user's reviews
    const averageRating = this.userReviews.length > 0 
      ? this.reviewService.calculateAverageRating(this.userReviews)
      : 0;
    
    console.log('Total bookings:', this.bookings.length);
    console.log('Pending bookings:', pendingBookings.length);
    console.log('Confirmed bookings:', confirmedBookings.length);
    console.log('Completed bookings:', completedBookings.length);
    console.log('Cancelled bookings:', cancelledBookings.length);
    console.log('Total spent:', totalSpent);
    console.log('User reviews:', this.userReviews.length);
    console.log('Average rating:', averageRating);
    
    this.dashboardStats = {
      totalRentals: this.bookings.length,
      completedRentals: completedBookings.length,
      averageRating: averageRating,
      totalSpent: totalSpent,
      upcomingRentals: confirmedBookings.length + pendingBookings.length
    };
    
    console.log('Updated dashboard stats:', this.dashboardStats);
  }

  setActiveTab(tab: 'overview' | 'upcoming' | 'history' | 'profile') {
    this.activeTab = tab;
  }

  getUpcomingRentals(): RentalHistory[] {
    return this.bookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING')
      .map(b => {
        const firstBookingItem = b.bookingItems?.[0];
        return {
          id: b.id,
          vehicleName: firstBookingItem?.vehicle?.name || 'Unknown Vehicle',
          vehicleImage: firstBookingItem?.vehicle?.images || 'assets/pexels-mayday-1545743.jpg',
          startDate: new Date(firstBookingItem?.startDate || b.startDate),
          endDate: new Date(firstBookingItem?.endDate || b.endDate),
          totalAmount: b.totalPrice,
          status: b.status
        };
      });
  }

  getPendingRentals(): RentalHistory[] {
    return this.bookings
      .filter(b => b.status === 'PENDING')
      .map(b => {
        const firstBookingItem = b.bookingItems?.[0];
        return {
          id: b.id,
          vehicleName: firstBookingItem?.vehicle?.name || 'Unknown Vehicle',
          vehicleImage: firstBookingItem?.vehicle?.images || 'assets/pexels-mayday-1545743.jpg',
          startDate: new Date(firstBookingItem?.startDate || b.startDate),
          endDate: new Date(firstBookingItem?.endDate || b.endDate),
          totalAmount: b.totalPrice,
          status: b.status
        };
      });
  }

  getConfirmedRentals(): RentalHistory[] {
    return this.bookings
      .filter(b => b.status === 'CONFIRMED')
      .map(b => {
        const firstBookingItem = b.bookingItems?.[0];
        return {
          id: b.id,
          vehicleName: firstBookingItem?.vehicle?.name || 'Unknown Vehicle',
          vehicleImage: firstBookingItem?.vehicle?.images || 'assets/pexels-mayday-1545743.jpg',
          startDate: new Date(firstBookingItem?.startDate || b.startDate),
          endDate: new Date(firstBookingItem?.endDate || b.endDate),
          totalAmount: b.totalPrice,
          status: b.status
        };
      });
  }

  getCompletedRentals(): RentalHistory[] {
    return this.bookings
      .filter(b => b.status === 'COMPLETED')
      .map(b => {
        const firstBookingItem = b.bookingItems?.[0];
        const vehicleId = firstBookingItem?.vehicle?.id;
        
        // Find user's review for this vehicle
        const userReview = this.userReviews.find(review => review.vehicleId === vehicleId);
        
        return {
          id: b.id,
          vehicleName: firstBookingItem?.vehicle?.name || 'Unknown Vehicle',
          vehicleImage: firstBookingItem?.vehicle?.images || 'assets/pexels-mayday-1545743.jpg',
          startDate: new Date(firstBookingItem?.startDate || b.startDate),
          endDate: new Date(firstBookingItem?.endDate || b.endDate),
          totalAmount: b.totalPrice,
          status: b.status,
          rating: userReview?.rating || undefined,
          review: userReview?.comment || undefined
        };
      });
  }

  getCancelledRentals(): RentalHistory[] {
    return this.bookings
      .filter(b => b.status === 'CANCELLED')
      .map(b => {
        const firstBookingItem = b.bookingItems?.[0];
        return {
          id: b.id,
          vehicleName: firstBookingItem?.vehicle?.name || 'Unknown Vehicle',
          vehicleImage: firstBookingItem?.vehicle?.images || 'assets/pexels-mayday-1545743.jpg',
          startDate: new Date(firstBookingItem?.startDate || b.startDate),
          endDate: new Date(firstBookingItem?.endDate || b.endDate),
          totalAmount: b.totalPrice,
          status: b.status
        };
      });
  }

  openRentalDetails(rental: RentalHistory) {
    this.selectedRental = rental;
    this.showRentalModal = true;
  }

  cancelBooking(bookingId: string) {
    if (confirm('Are you sure you want to cancel this booking?')) {
      this.bookingService.cancelBooking(bookingId).subscribe({
        next: () => {
          this.showMessage('Booking cancelled successfully', 'success');
          this.loadData(); // Reload data to reflect changes
        },
        error: (error) => {
          console.error('Failed to cancel booking:', error);
          this.showMessage('Failed to cancel booking', 'error');
        }
      });
    }
  }

  closeModal() {
    this.showRentalModal = false;
    this.selectedRental = null;
  }

  acceptRules() {
    this.showRulesModal = false;
  }

  loadProfile() {
    this.usersService.getMe().subscribe({
      next: (me) => {
        this.profile = {
          firstName: me.firstName,
          lastName: me.lastName,
          email: me.email,
          phone: (me as any).phone,
        };
      },
      error: (err) => {
        console.error('Failed to load profile', err);
      },
    });
  }

  saveProfile() {
    this.usersService.updateMe(this.profile).subscribe({
      next: (me) => {
        // persist to auth storage
        const user = this.authService.getCurrentUser();
        if (user) {
          this.authService['setAuthData']?.( // fallback if private, else update localStorage directly
            { ...user, firstName: me.firstName, lastName: me.lastName, email: me.email, phone: (me as any).phone } as any,
            this.authService.getToken() as any
          );
          localStorage.setItem('user', JSON.stringify({ ...user, firstName: me.firstName, lastName: me.lastName, email: me.email, phone: (me as any).phone }));
        }
        this.editProfile = false;
      },
      error: (err) => {
        console.error('Failed to update profile', err);
        this.showMessage('Failed to update profile', 'error');
      },
    });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CONFIRMED': return 'text-blue-600 bg-blue-100';
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusDescription(status: string): string {
    switch (status) {
      case 'PENDING': return 'Awaiting confirmation';
      case 'CONFIRMED': return 'Booking confirmed';
      case 'COMPLETED': return 'Rental completed';
      case 'CANCELLED': return 'Booking cancelled';
      case 'REJECTED': return 'Booking rejected';
      default: return 'Unknown status';
    }
  }

  getVehicleImage(imageUrl: string): string {
    return imageUrl || 'assets/pexels-mayday-1545743.jpg';
  }

  getStarRating(rating: number | undefined): string[] {
    if (!rating) return [];
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating ? '★' : '☆');
    }
    return stars;
  }

  get user() {
    return this.currentUser;
  }

  showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  getTotalSpent(): number {
    return this.bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalPrice, 0);
  }

  getActiveBookings(): number {
    return this.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
  }

  logout() {
    this.authService.logout();
  }
}
