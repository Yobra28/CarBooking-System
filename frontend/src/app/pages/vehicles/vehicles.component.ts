import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { VehicleService, Vehicle } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css'
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  isLoading = false;
  
  selectedType = '';
  selectedPriceRange = '';
  searchTerm = '';

  showConfirmDialog = false;
  confirmMessage = '';
  vehicleToDelete: Vehicle | null = null;

  constructor(
    private vehicleService: VehicleService,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadVehicles();
    
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm = params['search'];
      }
      if (params['type']) {
        this.selectedType = params['type'];
      }
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

    if (this.searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        vehicle.category.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(vehicle => 
        vehicle.category.toLowerCase() === this.selectedType.toLowerCase()
      );
    }

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

  confirmDelete(vehicle: Vehicle) {
    this.confirmMessage = `Are you sure you want to delete ${vehicle.make} ${vehicle.model}?`;
    this.vehicleToDelete = vehicle;
    this.showConfirmDialog = true;
  }

  onDialogConfirmed(confirmed: boolean) {
    if (confirmed && this.vehicleToDelete) {
      this.vehicleService.deleteVehicle(this.vehicleToDelete.id).subscribe({
        next: () => {
          this.vehicles = this.vehicles.filter(v => v.id !== this.vehicleToDelete!.id);
          this.filteredVehicles = this.filteredVehicles.filter(v => v.id !== this.vehicleToDelete!.id);
        },
        error: (error) => {
          console.error('Failed to delete vehicle:', error);
        }
      });
    }
    this.showConfirmDialog = false;
    this.vehicleToDelete = null;
  }
} 