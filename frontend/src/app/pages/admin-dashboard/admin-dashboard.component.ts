import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VehicleService, Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from '../../services/vehicle.service';
import { BookingService, Booking } from '../../services/booking.service';
import { BookingEventsService } from '../../services/booking-events.service';
import { AuthService, User } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { UsersService } from '../../services/users.service';
import { ContactService, ContactMessage } from '../../services/contact.service';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { KycVerificationModalComponent } from '../../components/kyc-verification-modal/kyc-verification-modal.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, KycVerificationModalComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  vehicles: Vehicle[] = [];
  bookings: Booking[] = [];
  users: User[] = [];
  contactMessages: ContactMessage[] = [];
  

  showAddVehicleForm = false;
  newVehicle: CreateVehicleRequest = {
    name: '',
    make: '',
    model: '',
    category: '',
    transmission: 'MANUAL',
    total: 1,
    fuelType: 'GASOLINE',
    pricePerDay: 0,
    color: '',
    mileage: 0,
    images: '',
    address: '',
    city: '',
    postalCode: ''
  };
  

  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  
  
  selectedEditFile: File | null = null;
  isEditUploading = false;
  

  editingVehicle: Vehicle | null = null;
  editVehicleData: UpdateVehicleRequest = {};
  showEditForm = false;
  

  isLoading = false;
  isSubmitting = false;
  

  message = '';
  messageType: 'success' | 'error' = 'success';
  
  // Search state
  bookingSearchTerm = '';
  userSearchTerm = '';
 
  dashboardStats = {
    totalVehicles: 0,
    availableVehicles: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    totalCustomers: 0
  };

  charts = {
    revenue: {
      labels: [] as string[],
      values: [] as number[],
      points: '',
      changePct: 0
    },
    bookingTrends: {
      labels: [] as string[],
      values: [] as number[],
      points: ''
    },
    topVehicles: {
      labels: [] as string[],
      values: [] as number[],
      max: 0
    },
    leastVehicles: {
      labels: [] as string[],
      values: [] as number[],
      max: 0
    }
  };

  // Analytics extras
  fleetUsageRate = 0; // 0..100
  customerDemographics = {
    verified: 0,
    unverified: 0,
  };

  // UI state: which admin section is shown
  activeSection: 'dashboard' | 'add' | 'manage' | 'booking' | 'users' | 'messages' = 'dashboard';

  showConfirmDialog = false;
  confirmMessage = '';
  vehicleToDelete: string | null = null;
  userToDelete: string | null = null;

  showKycModal = false;
  selectedUserForKyc: User | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private vehicleService: VehicleService,
    private bookingService: BookingService,
    private bookingEvents: BookingEventsService,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
    private usersService: UsersService,
    private contactService: ContactService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAuthentication();
    this.loadData();
    // Subscribe to booking events for real-time updates
    const evSub = this.bookingEvents.connect().subscribe(ev => {
      if (ev.type === 'booking_created' || ev.type === 'booking_updated' || ev.type === 'booking_cancelled') {
        // Simplest: reload bookings list
        this.bookingService.getAllBookings().subscribe(bs => {
          this.bookings = bs;
          this.updateDashboardStats();
        });
      }
    });
    this.subscriptions.push(evSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkAuthentication() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.showMessage('Please log in to access admin dashboard', 'error');
      this.router.navigate(['/login']);
      return;
    }

    if (this.currentUser.role !== 'ADMIN') {
      this.showMessage('Access denied. Admin privileges required.', 'error');
      this.router.navigate(['/']);
      return;
    }
  }

  setSection(section: 'dashboard' | 'add' | 'manage' | 'booking' | 'users' | 'messages') {
    this.activeSection = section;
    this.showAddVehicleForm = section === 'add';
    if (section === 'users' && this.users.length === 0) {
      this.loadUsers();
    }
  }

  loadData() {
    this.isLoading = true;
    
    const vehicleSub = this.vehicleService.getAllVehicles().subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.updateDashboardStats();
      },
      error: (error) => {
        console.error('Failed to load vehicles:', error);
        if (error.status === 401) {
          this.handleAuthError();
        } else {
          this.showMessage('Failed to load vehicles: ' + (error.error?.message || error.message), 'error');
        }
      }
    });

 
    const bookingSub = this.bookingService.getAllBookings().subscribe({
      next: (bookings) => {
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

    // Load users for dashboard stats (counts)
    const usersSub = this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.updateDashboardStats();
      },
      error: (error) => {
        console.error('Failed to load users for stats:', error);
        // Do not block dashboard on user load errors
      }
    });

    // Load contact messages
    const messagesSub = this.contactService.getAllContactMessages().subscribe({
      next: (messages) => {
        this.contactMessages = messages;
      },
      error: (error) => {
        console.error('Failed to load messages:', error);
      }
    });

    this.subscriptions.push(vehicleSub, bookingSub, usersSub, messagesSub);
  }

  loadUsers() {
    const sub = this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        if (error.status === 401) {
          this.handleAuthError();
        } else {
          this.showMessage('Failed to load users: ' + (error.error?.message || error.message), 'error');
        }
      }
    });
    this.subscriptions.push(sub);
  }

  private handleAuthError() {
    this.showMessage('Authentication failed. Please log in again.', 'error');
    this.authService.logout();
  }

  private updateDashboardStats() {
    this.dashboardStats = {
      totalVehicles: this.vehicles.length,
      availableVehicles: this.vehicles.length, 
      totalBookings: this.bookings.length,
      pendingBookings: this.bookings.filter(b => b.status === 'PENDING').length,
      // Revenue from confirmed and completed bookings only
      totalRevenue: this.bookings
        .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      totalCustomers: this.users.filter(u => u.role === 'CUSTOMER').length
    };
    this.buildCharts();
  }

  private buildCharts() {
    this.buildRevenueChart();
    this.buildVehicleCharts();
    this.buildBookingTrendsChart();
    this.buildFleetUsage();
    this.buildCustomerDemographics();
  }

  private buildRevenueChart() {
    // Group revenue by month (YYYY-MM) for last 6 months
    const sums = new Map<string, number>();
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      sums.set(key, 0);
    }

    for (const b of this.bookings) {
      const d = b.createdAt ? new Date(b.createdAt as any) : new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (sums.has(key)) {
        sums.set(key, (sums.get(key) || 0) + (b.totalPrice || 0));
      }
    }

    const values = months.map(m => sums.get(m) || 0);

    // Compute change vs previous month
    const last = values[values.length - 1] || 0;
    const prev = values[values.length - 2] || 0;
    const changePct = prev === 0 ? (last > 0 ? 100 : 0) : ((last - prev) / prev) * 100;

    // Build polyline points for a 600x200 area with padding
    const width = 600;
    const height = 200;
    const pad = 20;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const maxV = Math.max(1, ...values);
    const stepX = values.length > 1 ? innerW / (values.length - 1) : innerW;
    const pts: string[] = [];
    values.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = pad + innerH - (v / maxV) * innerH;
      pts.push(`${x},${y}`);
    });

    this.charts.revenue = {
      labels: months,
      values,
      points: pts.join(' '),
      changePct: Math.round(changePct * 10) / 10,
    };
  }

  private buildVehicleCharts() {
    // Count bookings per vehicleId
    const counts = new Map<string, number>();
    for (const b of this.bookings) {
      const items = b.bookingItems || [];
      for (const it of items) {
        const vId = it.vehicle?.id;
        if (!vId) continue;
        counts.set(vId, (counts.get(vId) || 0) + 1);
      }
    }

    // Map vehicleId to name
    const vehicleName = new Map<string, string>();
    for (const v of this.vehicles) {
      vehicleName.set(v.id, v.name);
      if (!counts.has(v.id)) counts.set(v.id, 0);
    }

    const entries = Array.from(counts.entries());
    const top = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
    const least = entries.sort((a, b) => a[1] - b[1]).slice(0, 5);

    const topLabels = top.map(([id]) => vehicleName.get(id) || id);
    const topValues = top.map(([, c]) => c);
    const leastLabels = least.map(([id]) => vehicleName.get(id) || id);
    const leastValues = least.map(([, c]) => c);

    this.charts.topVehicles = {
      labels: topLabels,
      values: topValues,
      max: Math.max(1, ...topValues)
    };

    this.charts.leastVehicles = {
      labels: leastLabels,
      values: leastValues,
      max: Math.max(1, ...leastValues)
    };
  }

  private buildBookingTrendsChart() {
    // Count bookings created per month (last 6 months)
    const sums = new Map<string, number>();
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      sums.set(key, 0);
    }
    for (const b of this.bookings) {
      const d = b.createdAt ? new Date(b.createdAt as any) : new Date();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (sums.has(key)) {
        sums.set(key, (sums.get(key) || 0) + 1);
      }
    }
    const values = months.map(m => sums.get(m) || 0);
    // Build polyline points (reuse 600x200 area)
    const width = 600, height = 200, pad = 20, innerW = width - pad * 2, innerH = height - pad * 2;
    const maxV = Math.max(1, ...values);
    const stepX = values.length > 1 ? innerW / (values.length - 1) : innerW;
    const pts: string[] = [];
    values.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = pad + innerH - (v / maxV) * innerH;
      pts.push(`${x},${y}`);
    });
    this.charts.bookingTrends = { labels: months, values, points: pts.join(' ') };
  }

  private buildFleetUsage() {
    // Compute usage over the last 30 days: booked days / (vehicles * 30)
    const vehiclesCount = this.vehicles.length || 1;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    let bookedDays = 0;
    const dayMs = 1000 * 60 * 60 * 24;
    for (const b of this.bookings) {
      if (b.status !== 'CONFIRMED' && b.status !== 'COMPLETED') continue;
      const it = (b.bookingItems || [])[0];
      if (!it) continue;
      const s = new Date(it.startDate as any);
      const e = new Date(it.endDate as any);
      const overlapStart = new Date(Math.max(s.getTime(), start.getTime()));
      const overlapEnd = new Date(Math.min(e.getTime(), now.getTime()));
      if (overlapEnd > overlapStart) {
        bookedDays += Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / dayMs);
      }
    }
    const totalDays = vehiclesCount * 30;
    this.fleetUsageRate = Math.max(0, Math.min(100, Math.round((bookedDays / totalDays) * 100)));
  }

  private buildCustomerDemographics() {
    const customers = this.users.filter(u => u.role === 'CUSTOMER');
    const verified = customers.filter(u => (u as any).isKycVerified).length;
    const unverified = customers.length - verified;
    this.customerDemographics = { verified, unverified };
  }

 
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {

      if (!file.type.startsWith('image/')) {
        this.showMessage('Please select an image file', 'error');
        return;
      }
      
  
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('File size must be less than 5MB', 'error');
        return;
      }
      
      this.selectedFile = file;
      console.log('Selected file:', file.name, file.size, file.type);
    }
  }

  onEditFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {

      if (!file.type.startsWith('image/')) { 
        this.showMessage('Please select an image file', 'error');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showMessage('File size must be less than 5MB', 'error');
        return;
      }
      
      this.selectedEditFile = file;
      console.log('Selected edit file:', file.name, file.size, file.type);
    }
  }

  uploadFile(): Observable<any> {
    if (!this.selectedFile) {
      throw new Error('No file selected');
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    return this.fileUploadService.uploadFile(this.selectedFile);
  }

  uploadEditFile(): Observable<any> {
    if (!this.selectedEditFile) {
      throw new Error('No file selected');
    }

    this.isEditUploading = true;

    return this.fileUploadService.uploadFile(this.selectedEditFile);
  }

  
  addVehicle() {
    this.isSubmitting = true;
    
    if (this.selectedFile) {
      
      this.uploadFile().subscribe({
        next: (uploadResponse) => {
         
          const vehicleData = { ...this.newVehicle, images: uploadResponse.url };
          
          this.vehicleService.createVehicle(vehicleData).subscribe({
            next: (response) => {
              this.vehicles.push(response.data);
              this.showAddVehicleForm = false;
              this.resetNewVehicleForm();
              this.updateDashboardStats();
              this.showMessage('Vehicle added successfully with image', 'success');
            },
            error: (error) => {
              console.error('Failed to add vehicle:', error);
              if (error.status === 401) {
                this.handleAuthError();
              } else {
                this.showMessage('Failed to add vehicle: ' + (error.error?.message || error.message), 'error');
              }
            },
            complete: () => {
              this.isSubmitting = false;
              this.isUploading = false;
              this.selectedFile = null;
            }
          });
        },
        error: (error) => {
          console.error('Failed to upload file:', error);
          this.showMessage('Failed to upload image: ' + (error.error?.message || error.message), 'error');
          this.isSubmitting = false;
          this.isUploading = false;
        }
      });
    } else {
    
      this.vehicleService.createVehicle(this.newVehicle).subscribe({
        next: (response) => {
          this.vehicles.push(response.data);
          this.showAddVehicleForm = false;
          this.resetNewVehicleForm();
          this.updateDashboardStats();
          this.showMessage('Vehicle added successfully', 'success');
        },
        error: (error) => {
          console.error('Failed to add vehicle:', error);
          if (error.status === 401) {
            this.handleAuthError();
          } else {
            this.showMessage('Failed to add vehicle: ' + (error.error?.message || error.message), 'error');
          }
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  editVehicle(vehicle: Vehicle) {
    this.editingVehicle = vehicle;
    this.editVehicleData = {
      name: vehicle.name,
      make: vehicle.make,
      model: vehicle.model,
      category: vehicle.category,
      transmission: vehicle.transmission,
      total: vehicle.total,
      fuelType: vehicle.fuelType,
      pricePerDay: vehicle.pricePerDay,
      color: vehicle.color,
      mileage: vehicle.mileage,
      images: vehicle.images,
      address: vehicle.address,
      city: vehicle.city,
      postalCode: vehicle.postalCode
    };
    this.showEditForm = true;
    this.selectedEditFile = null;
  }

  updateVehicle() {
    if (!this.editingVehicle) return;
    
    this.isSubmitting = true;
    
    if (this.selectedEditFile) {
    
      this.uploadEditFile().subscribe({
        next: (uploadResponse) => {
      
          const vehicleData = { ...this.editVehicleData, images: uploadResponse.url };
          
          this.vehicleService.updateVehicle(this.editingVehicle!.id, vehicleData).subscribe({
            next: (updatedVehicle) => {
              const index = this.vehicles.findIndex(v => v.id === updatedVehicle.id);
              if (index !== -1) {
                this.vehicles[index] = updatedVehicle;
              }
              this.cancelEdit();
              this.updateDashboardStats();
              this.showMessage('Vehicle updated successfully with new image', 'success');
            },
            error: (error) => {
              console.error('Failed to update vehicle:', error);
              if (error.status === 401) {
                this.handleAuthError();
              } else {
                this.showMessage('Failed to update vehicle: ' + (error.error?.message || error.message), 'error');
              }
            },
            complete: () => {
              this.isSubmitting = false;
              this.isEditUploading = false;
              this.selectedEditFile = null;
            }
          });
        },
        error: (error) => {
          console.error('Failed to upload file:', error);
          this.showMessage('Failed to upload image: ' + (error.error?.message || error.message), 'error');
          this.isSubmitting = false;
          this.isEditUploading = false;
        }
      });
    } else {
  
      this.vehicleService.updateVehicle(this.editingVehicle.id, this.editVehicleData).subscribe({
        next: (updatedVehicle) => {
          const index = this.vehicles.findIndex(v => v.id === updatedVehicle.id);
          if (index !== -1) {
            this.vehicles[index] = updatedVehicle;
          }
          this.cancelEdit();
          this.updateDashboardStats();
          this.showMessage('Vehicle updated successfully', 'success');
        },
        error: (error) => {
          console.error('Failed to update vehicle:', error);
          if (error.status === 401) {
            this.handleAuthError();
          } else {
            this.showMessage('Failed to update vehicle: ' + (error.error?.message || error.message), 'error');
          }
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteVehicle(vehicleId: string) {
    this.confirmMessage = `Are you sure you want to delete this vehicle?`;
    this.vehicleToDelete = vehicleId;
    this.showConfirmDialog = true;
  }

  onDialogConfirmed(confirmed: boolean) {
    if (confirmed) {
      if (this.vehicleToDelete) {
        this.vehicleService.deleteVehicle(this.vehicleToDelete).subscribe({
          next: () => {
            this.vehicles = this.vehicles.filter(v => v.id !== this.vehicleToDelete);
            this.updateDashboardStats();
            this.showMessage('Vehicle deleted successfully', 'success');
          },
          error: (error) => {
            console.error('Failed to delete vehicle:', error);
            if (error.status === 401) {
              this.handleAuthError();
            } else {
              this.showMessage('Failed to delete vehicle: ' + (error.error?.message || error.message), 'error');
            }
          }
        });
      } else if (this.userToDelete) {
        this.usersService.deleteUser(this.userToDelete).subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== this.userToDelete);
            this.showMessage('User deleted successfully', 'success');
          },
          error: (error) => {
            console.error('Failed to delete user:', error);
            if (error.status === 401) {
              this.handleAuthError();
            } else {
              this.showMessage('Failed to delete user: ' + (error.error?.message || error.message), 'error');
            }
          }
        });
      }
    }
    this.showConfirmDialog = false;
    this.vehicleToDelete = null;
    this.userToDelete = null;
  }

  cancelEdit() {
    this.editingVehicle = null;
    this.editVehicleData = {};
    this.showEditForm = false;
    this.selectedEditFile = null;
  }

  resetNewVehicleForm() {
    this.newVehicle = {
      name: '',
      make: '',
      model: '',
      category: '',
      transmission: 'MANUAL',
      total: 1,
      fuelType: 'GASOLINE',
      pricePerDay: 0,
      color: '',
      mileage: 0,
      images: '',
      address: '',
      city: '',
      postalCode: ''
    };
    this.selectedFile = null;
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

  showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  getTotalRevenue(): number {
    return this.bookings
      .filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalPrice, 0);
  }

  getActiveBookings(): number {
    return this.bookings.filter(b => b.status === 'CONFIRMED').length;
  }

  getAvailableVehicles(): number {
    return this.vehicles.length; 
  }

  // Filters
  filteredBookings(): Booking[] {
    const term = this.bookingSearchTerm.trim().toLowerCase();
    if (!term) return this.bookings;
    const matches = (v?: string | null) => !!v && v.toLowerCase().includes(term);
    return this.bookings.filter(b => {
      const email = b.user?.email || b.guestEmail || '';
      const phone = (b as any).user?.phone || b.guestPhone || '';
      return matches(email) || matches(phone);
    });
  }

  filteredUsers(): User[] {
    const term = this.userSearchTerm.trim().toLowerCase();
    if (!term) return this.users;
    const matches = (v?: string | null) => !!v && v.toLowerCase().includes(term);
    return this.users.filter(u => matches(u.email) || matches((u as any).phone || ''));
  }

  applyBookingSearch() {
    this.bookingSearchTerm = this.bookingSearchTerm.trim();
  }

  applyUserSearch() {
    this.userSearchTerm = this.userSearchTerm.trim();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) {
      return '$0.00';
    }
    return `$${amount.toFixed(2)}`;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  // Messages
  getUnreadMessagesCount(): number {
    return this.contactMessages.filter(m => m.status === 'unread').length;
  }

  deleteMessage(messageId: string) {
    this.contactService.deleteContactMessage(messageId).subscribe({
      next: () => {
        this.contactMessages = this.contactMessages.filter(m => m.id !== messageId);
        this.showMessage('Message deleted successfully', 'success');
      },
      error: (error) => {
        console.error('Failed to delete message:', error);
        this.showMessage('Failed to delete message: ' + (error.error?.message || error.message), 'error');
      }
    });
  }

  confirmDelete(vehicleId: string, vehicleName: string) {
    this.confirmMessage = `Are you sure you want to delete ${vehicleName}?`;
    this.vehicleToDelete = vehicleId;
    this.showConfirmDialog = true;
  }

  confirmDeleteUser(userId: string, userEmail: string) {
    this.confirmMessage = `Delete user ${userEmail}?`;
    this.userToDelete = userId;
    this.showConfirmDialog = true;
  }

  viewUserKyc(user: User) {
    this.selectedUserForKyc = user;
    this.showKycModal = true;
  }

  closeKycModal() {
    this.showKycModal = false;
    this.selectedUserForKyc = null;
    // Refresh users to update KYC status
    this.loadUsers();
  }

  onKycApproved() {
    this.showMessage('KYC approved successfully!', 'success');
    this.closeKycModal();
  }

  onKycRejected() {
    this.showMessage('KYC rejected. User will need to resubmit.', 'success');
    this.closeKycModal();
  }
} 
