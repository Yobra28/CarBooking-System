import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { VehicleService, Vehicle } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css'
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  isLoading = false;
  
  // Filter properties
  selectedType = '';
  selectedPriceRange = '';
  searchTerm = '';

  constructor(
    private vehicleService: VehicleService,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadVehicles();
    
    // Handle search parameters from URL
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
      }
      if (params['type']) {
        this.selectedType = params['type'];
      }
      // Apply filters after loading vehicles
      if (this.vehicles.length > 0) {
        this.filterVehicles();
      }
    });
  }

  loadVehicles() {
    this.isLoading = true;
    this.vehicleService.getAllVehicles().subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.filteredVehicles = vehicles;
        this.isLoading = false;
        
        // Apply filters after vehicles are loaded
        this.filterVehicles();
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.isLoading = false;
      }
    });
  }

  filterVehicles() {
    let filtered = this.vehicles;

    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vehicle.category.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Filter by type (category)
    if (this.selectedType) {
      filtered = filtered.filter(vehicle => 
        vehicle.category.toLowerCase() === this.selectedType.toLowerCase()
      );
    }

    // Filter by price range
    if (this.selectedPriceRange) {
      const [min, max] = this.selectedPriceRange.split('-').map(Number);
      filtered = filtered.filter(vehicle => {
        if (max) {
          return vehicle.pricePerDay >= min && vehicle.pricePerDay <= max;
        } else {
          return vehicle.pricePerDay >= min;
        }
      });
    }

    this.filteredVehicles = filtered;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedPriceRange = '';
    this.filterVehicles();
  }

  getVehicleImage(vehicle: Vehicle): string {
    return vehicle.images || 'assets/pexels-mayday-1545743.jpg';
  }

  getVehicleTitle(vehicle: Vehicle): string {
    return `${vehicle.make} ${vehicle.model} - ${vehicle.category}`;
  }

  getVehicleDescription(vehicle: Vehicle): string {
    return `${vehicle.make} ${vehicle.model} - ${vehicle.category} vehicle`;
  }

  isVehicleAvailable(vehicle: Vehicle): boolean {
    return vehicle.total > 0;
  }

  isVehicleNew(vehicle: Vehicle): boolean {
    const createdAt = new Date(vehicle.createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
    return daysDiff < 30;
  }

  isVehiclePopular(vehicle: Vehicle): boolean {
    return vehicle.pricePerDay < 60;
  }
} 