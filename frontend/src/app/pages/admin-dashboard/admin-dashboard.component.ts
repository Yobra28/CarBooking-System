import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VehicleService, Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from '../../services/vehicle.service';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService, User } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Subscription } from 'rxjs';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  vehicles: Vehicle[] = [];
  bookings: Booking[] = [];
  

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
  
 
  dashboardStats = {
    totalVehicles: 0,
    availableVehicles: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private vehicleService: VehicleService,
    private bookingService: BookingService,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
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

    this.subscriptions.push(vehicleSub, bookingSub);
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
      totalRevenue: this.bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
    };
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
      // Validate file type
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
    if (confirm('Are you sure you want to delete this vehicle?')) {
      this.vehicleService.deleteVehicle(vehicleId).subscribe({
        next: () => {
          this.vehicles = this.vehicles.filter(v => v.id !== vehicleId);
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
    }
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
    return this.bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  }

  getActiveBookings(): number {
    return this.bookings.filter(b => b.status === 'CONFIRMED').length;
  }

  getAvailableVehicles(): number {
    return this.vehicles.length; 
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

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
} 