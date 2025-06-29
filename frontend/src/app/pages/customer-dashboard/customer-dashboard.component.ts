import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService, User } from '../../services/auth.service';

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
  styleUrl: './customer-dashboard.component.css'
})
export class CustomerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  bookings: Booking[] = [];
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
  
  // Loading states
  isLoading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private bookingService: BookingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadData();
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
        this.updateDashboardStats();
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

  updateDashboardStats() {
    const completedBookings = this.bookings.filter(b => b.status === 'COMPLETED');
    const confirmedBookings = this.bookings.filter(b => b.status === 'CONFIRMED');
    const pendingBookings = this.bookings.filter(b => b.status === 'PENDING');
    const cancelledBookings = this.bookings.filter(b => b.status === 'CANCELLED');
    
    // Calculate total spent from all bookings (including cancelled ones)
    const totalSpent = this.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    
    console.log('Total bookings:', this.bookings.length);
    console.log('Pending bookings:', pendingBookings.length);
    console.log('Confirmed bookings:', confirmedBookings.length);
    console.log('Completed bookings:', completedBookings.length);
    console.log('Cancelled bookings:', cancelledBookings.length);
    console.log('Total spent:', totalSpent);
    
    this.dashboardStats = {
      totalRentals: this.bookings.length,
      completedRentals: completedBookings.length,
      averageRating: completedBookings.length > 0 ? 4.2 : 0, // Mock average rating
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
        return {
          id: b.id,
          vehicleName: firstBookingItem?.vehicle?.name || 'Unknown Vehicle',
          vehicleImage: firstBookingItem?.vehicle?.images || 'assets/pexels-mayday-1545743.jpg',
          startDate: new Date(firstBookingItem?.startDate || b.startDate),
          endDate: new Date(firstBookingItem?.endDate || b.endDate),
          totalAmount: b.totalPrice,
          status: b.status,
          rating: 4, // Mock rating
          review: 'Great experience with this vehicle!' // Mock review
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
    if (confirm('Are you sure you want to cancel this booking? This action will notify our agents.')) {
      this.bookingService.cancelBooking(bookingId).subscribe({
        next: (updatedBooking) => {
          const index = this.bookings.findIndex(b => b.id === updatedBooking.id);
          if (index !== -1) {
            this.bookings[index] = updatedBooking;
          }
          this.updateDashboardStats();
          this.closeModal();
          this.showMessage('Booking cancelled successfully. Our agents have been notified.', 'success');
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          this.showMessage('Failed to cancel booking. Please try again.', 'error');
        }
      });
    }
  }

  closeModal() {
    this.showRentalModal = false;
    this.selectedRental = null;
  }

  // Utility methods
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDescription(status: string): string {
    switch (status) {
      case 'PENDING': return 'Waiting for agent confirmation';
      case 'CONFIRMED': return 'Confirmed by agent - ready for pickup';
      case 'CANCELLED': return 'Booking has been cancelled';
      case 'COMPLETED': return 'Rental completed successfully';
      default: return 'Unknown status';
    }
  }

  getVehicleImage(imageUrl: string): string {
    return imageUrl || 'assets/pexels-mayday-1545743.jpg';
  }

  getStarRating(rating: number | undefined): string[] {
    if (!rating) return [];
    return Array.from({ length: rating }, () => '★').concat(
      Array.from({ length: 5 - rating }, () => '☆')
    );
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
    return this.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  }

  getActiveBookings(): number {
    return this.bookings.filter(b => b.status === 'CONFIRMED').length;
  }
} 