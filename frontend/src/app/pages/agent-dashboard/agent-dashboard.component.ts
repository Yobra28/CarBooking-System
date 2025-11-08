import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService, Booking } from '../../services/booking.service';
import { ContactService, ContactMessage } from '../../services/contact.service';
import { AuthService, User } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
}

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-dashboard.component.html',
  styleUrls: ['./agent-dashboard.component.css']
})
export class AgentDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  bookings: Booking[] = [];
  contactMessages: ContactMessage[] = [];
  dashboardStats: DashboardStats = {
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    confirmedBookings: 0,
    totalRevenue: 0
  };
  
  // UI State
  activeTab: 'bookings' | 'messages' = 'bookings';
  showBookingModal = false;
  showMessageModal = false;
  selectedBooking: Booking | null = null;
  selectedMessage: ContactMessage | null = null;
  
  // Loading states
  isLoading = false;
  
  // Messages
  message = '';
  messageType: 'success' | 'error' = 'success';

  private subscriptions: Subscription[] = [];

  constructor(
    private bookingService: BookingService,
    private contactService: ContactService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAuthentication();
    this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkAuthentication() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.showMessage('Please log in to access agent dashboard', 'error');
      this.router.navigate(['/login']);
      return;
    }

    if (this.currentUser.role !== 'AGENT' && this.currentUser.role !== 'ADMIN') {
      this.showMessage('Access denied. Agent privileges required.', 'error');
      this.router.navigate(['/']);
      return;
    }
  }

  loadData() {
    this.isLoading = true;
    
    // Load bookings
    const bookingSub = this.bookingService.getAllBookings().subscribe({
      next: (bookings) => {
        console.log('Loaded bookings:', bookings);
        this.bookings = bookings;
        this.updateDashboardStats();
      },
      error: (error) => {
        console.error('Failed to load bookings:', error);
        if (error.status === 401) {
          this.handleAuthError();
        } else {
          this.showMessage('Failed to load bookings: ' + (error.error?.message || error.message), 'error');
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });

    this.subscriptions.push(bookingSub);

    // Load contact messages
    this.loadContactMessages();
  }

  private handleAuthError() {
    this.showMessage('Authentication failed. Please log in again.', 'error');
    this.authService.logout();
  }

  loadContactMessages() {
    this.contactService.getAllContactMessages().subscribe({
      next: (messages: ContactMessage[]) => {
        this.contactMessages = messages;
      },
      error: (error: any) => {
        console.error('Failed to load contact messages:', error);
        if (error.status === 401) {
          this.handleAuthError();
        } else {
          this.showMessage('Failed to load contact messages: ' + (error.error?.message || error.message), 'error');
        }
      }
    });
  }

  updateDashboardStats() {
    this.dashboardStats = {
      totalBookings: this.bookings.length,
      pendingBookings: this.bookings.filter(b => b.status === 'PENDING').length,
      completedBookings: this.bookings.filter(b => b.status === 'COMPLETED').length,
      confirmedBookings: this.bookings.filter(b => b.status === 'CONFIRMED').length,
      totalRevenue: this.bookings.reduce((sum, b) => sum + b.totalPrice, 0)
    };
  }

  setActiveTab(tab: 'bookings' | 'messages') {
    this.activeTab = tab;
  }

  getUnreadMessagesCount(): number {
    return this.contactMessages.filter(m => m.status === 'unread').length;
  }

  // Helper methods to extract booking information
  getBookingVehicleName(booking: Booking): string {
    // Try to get vehicle name from bookingItems first
    if (booking.bookingItems && booking.bookingItems.length > 0) {
      return booking.bookingItems[0].vehicle?.name || 'Unknown Vehicle';
    }
    // Fallback to old structure
    if (booking.vehicle) {
      return booking.vehicle.name || 'Unknown Vehicle';
    }
    return 'Unknown Vehicle';
  }

  getBookingStartDate(booking: Booking): string {
    // Try to get start date from bookingItems first
    if (booking.bookingItems && booking.bookingItems.length > 0) {
      return booking.bookingItems[0].startDate;
    }
    // Fallback to old structure
    return booking.startDate || '';
  }

  getBookingEndDate(booking: Booking): string {
    // Try to get end date from bookingItems first
    if (booking.bookingItems && booking.bookingItems.length > 0) {
      return booking.bookingItems[0].endDate;
    }
    // Fallback to old structure
    return booking.endDate || '';
  }

  getCustomerName(booking: Booking): string {
    if (booking.user) {
      return `${booking.user.firstName} ${booking.user.lastName}`;
    }
    return booking.guestName || 'Guest Customer';
  }

  getCustomerEmail(booking: Booking): string {
    if (booking.user) {
      return booking.user.email;
    }
    return booking.guestEmail || 'N/A';
  }

  openBookingDetails(booking: Booking) {
    this.selectedBooking = booking;
    this.showBookingModal = true;
  }

  openMessageDetails(message: ContactMessage) {
    this.selectedMessage = message;
    this.showMessageModal = true;
    
    // Mark as read if it's unread
    if (message.status === 'unread') {
      this.contactService.updateContactMessage(message.id, { status: 'read' }).subscribe({
        next: (updatedMessage: ContactMessage) => {
          const index = this.contactMessages.findIndex(m => m.id === updatedMessage.id);
          if (index !== -1) {
            this.contactMessages[index] = updatedMessage;
          }
        },
        error: (error: any) => {
          console.error('Failed to update message status:', error);
        }
      });
    }
  }

  updateBookingStatus(bookingId: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') {
    this.bookingService.updateBooking(bookingId, { status }).subscribe({
      next: (updatedBooking) => {
        const index = this.bookings.findIndex(b => b.id === updatedBooking.id);
        if (index !== -1) {
          this.bookings[index] = updatedBooking;
        }
        this.updateDashboardStats();
        this.showMessage('Booking status updated successfully', 'success');
      },
      error: (error) => {
        console.error('Failed to update booking status:', error);
        if (error.status === 401) {
          this.handleAuthError();
        } else {
          this.showMessage('Failed to update booking status: ' + (error.error?.message || error.message), 'error');
        }
      }
    });
  }

  deleteMessage(messageId: string) {
    this.contactService.deleteContactMessage(messageId).subscribe({
      next: () => {
        this.contactMessages = this.contactMessages.filter(m => m.id !== messageId);
        this.showMessage('Message deleted successfully', 'success');
      },
      error: (error: any) => {
        console.error('Failed to delete message:', error);
        if (error.status === 401) {
          this.handleAuthError();
        } else {
          this.showMessage('Failed to delete message: ' + (error.error?.message || error.message), 'error');
        }
      }
    });
  }

  closeModal() {
    this.showBookingModal = false;
    this.showMessageModal = false;
    this.selectedBooking = null;
    this.selectedMessage = null;
  }

  showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return 'Invalid Date';
    }
  }

  formatDateTime(date: Date | string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString();
    } catch (error) {
      console.error('Error formatting datetime:', date, error);
      return 'Invalid Date';
    }
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

  getMessageStatusColor(status: string): string {
    switch (status) {
      case 'unread': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
