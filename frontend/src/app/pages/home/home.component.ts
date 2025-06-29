import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VehicleService, Vehicle } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  featuredVehicles: Vehicle[] = [];
  isLoading = false;
  popularVehicles: Vehicle[] = [];
  isLoadingVehicles = false;
  
  // Search form properties
  selectedVehicleType = '';
  searchTerm = '';

  constructor(
    private vehicleService: VehicleService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadFeaturedVehicles();
    this.loadPopularVehicles();
  }

  loadFeaturedVehicles() {
    this.isLoading = true;
    this.vehicleService.getAllVehicles().subscribe({
      next: (vehicles) => {
        this.featuredVehicles = vehicles
          .filter(vehicle => vehicle.total > 0)
          .slice(0, 6);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading featured vehicles:', error);
        this.isLoading = false;
      }
    });
  }

  loadPopularVehicles() {
    this.isLoadingVehicles = true;
    this.vehicleService.getAllVehicles().subscribe({
      next: (vehicles) => {
        // Get first 6 vehicles as popular vehicles
        this.popularVehicles = vehicles.slice(0, 6);
      },
      error: (error) => {
        console.error('Failed to load vehicles:', error);
      },
      complete: () => {
        this.isLoadingVehicles = false;
      }
    });
  }

  getVehicleImage(vehicle: Vehicle): string {
    return vehicle.images || 'assets/pexels-mayday-1545743.jpg';
  }

  // Helper method to get vehicle description
  getVehicleDescription(vehicle: Vehicle): string {
    return `${vehicle.make} ${vehicle.model} - ${vehicle.category} vehicle`;
  }

  // Helper method to check if vehicle is popular
  isVehiclePopular(vehicle: Vehicle): boolean {
    return vehicle.pricePerDay < 60;
  }

  // Helper method to check if vehicle is new
  isVehicleNew(vehicle: Vehicle): boolean {
    const createdAt = new Date(vehicle.createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
    return daysDiff < 30;
  }

  // Helper method to check if vehicle is available
  isVehicleAvailable(vehicle: Vehicle): boolean {
    return vehicle.total > 0;
  }

  getVehicleTitle(vehicle: Vehicle): string {
    return `${vehicle.make} ${vehicle.model} - ${vehicle.category} vehicle`;
  }

  isAffordable(vehicle: Vehicle): boolean {
    return vehicle.pricePerDay < 60;
  }

  bookVehicle(vehicleId: string) {
    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      // User is authenticated, proceed to booking
      this.router.navigate(['/booking', vehicleId]);
    } else {
      // User is not authenticated, show message and redirect to login
      const returnUrl = `/booking/${vehicleId}`;
      
      // Show a brief message before redirecting
      const message = `Please login or create an account to book this vehicle.`;
      alert(message); // You can replace this with a better notification system
      
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  viewVehicleDetails(vehicleId: string) {
    // Navigate to vehicle details page (public access)
    this.router.navigate(['/car', vehicleId]);
  }

  searchVehicles() {
    // Build query parameters
    const queryParams: any = {};
    
    if (this.searchTerm) {
      queryParams.search = this.searchTerm;
    }
    
    if (this.selectedVehicleType) {
      queryParams.type = this.selectedVehicleType;
    }
    
    // Navigate to vehicles page with search parameters
    this.router.navigate(['/vehicles'], { queryParams });
  }
}
