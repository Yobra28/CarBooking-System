import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehicleService, Vehicle } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import { ReviewComponent } from '../../components/review/review.component';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-car-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ReviewComponent],
  templateUrl: './car-details.component.html',
  styleUrls: ['./car-details.component.css']
})
export class CarDetailsComponent implements OnInit {
  vehicle: Vehicle | null = null;
  isLoading = false;
  errorMessage = '';
  selectedImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService,
    public authService: AuthService,
    private cartService: CartService,
  ) {}

  addToCart() {
    if (this.vehicle) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.cartService.addVehicle(this.vehicle as any);
      this.router.navigate(['/cart']);
    }
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const vehicleId = params['id'];
      if (vehicleId) {
        this.loadVehicle(vehicleId);
      }
    });
  }

  loadVehicle(vehicleId: string) {
    this.isLoading = true;
    this.errorMessage = '';

    this.vehicleService.getVehicleById(vehicleId).subscribe({
      next: (vehicle) => {
        this.vehicle = vehicle;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vehicle:', error);
        this.errorMessage = 'Failed to load vehicle details. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  bookVehicle() {
    if (this.vehicle) {
      // Check if user is authenticated
      if (this.authService.isAuthenticated()) {
        // User is authenticated, proceed to booking
        this.router.navigate(['/booking', this.vehicle.id]);
      } else {
        // User is not authenticated, show message and redirect to login
        const returnUrl = `/booking/${this.vehicle.id}`;
        
        // Show a brief message before redirecting
        const message = `Please login or create an account to book this vehicle.`;
        alert(message); // You can replace this with a better notification system
        
        this.router.navigate(['/login'], { queryParams: { returnUrl } });
      }
    }
  }

  onReviewSubmitted() {
    // Reload vehicle data to get updated review statistics
    if (this.vehicle) {
      this.loadVehicle(this.vehicle.id);
    }
  }

  // Helper method to get vehicle image or fallback
  getVehicleImage(): string {
    return this.vehicle?.images || 'assets/pexels-mayday-1545743.jpg';
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
  isVehicleAvailable(): boolean {
    return (this.vehicle?.total ?? 0) > 0;
  }

  // Helper method to get vehicle features
  getVehicleFeatures(vehicle: Vehicle): string[] {
    return [
      `${vehicle.category} Category`,
      `${vehicle.color} Color`,
      `${vehicle.pricePerDay}/day Price`
    ];
  }

  getVehicleTitle(vehicle: Vehicle): string {
    return `${vehicle.make} ${vehicle.model} - ${vehicle.category} vehicle`;
  }

  isAffordable(vehicle: Vehicle): boolean {
    return vehicle.pricePerDay < 60;
  }
}
