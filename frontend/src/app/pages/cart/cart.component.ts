import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  items: CartItem[] = [];
  isSubmitting = false;
  message = '';

  constructor(
    private cart: CartService,
    private auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.refresh();
  }

  refresh() {
    this.items = this.cart.getItems();
  }

  onDateChange(item: CartItem) {
    this.cart.updateDates(item.vehicleId, item.startDate, item.endDate);
    this.refresh();
  }

  days(item: CartItem) {
    return this.cart.daysFor(item);
  }

  itemTotal(item: CartItem) {
    return this.cart.itemTotal(item);
  }

  total() {
    return this.cart.grandTotal();
  }

  remove(item: CartItem) {
    this.cart.remove(item.vehicleId);
    this.refresh();
  }

  checkout() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      alert('Please login to checkout');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }

    const vehicles = this.items
      .filter(i => i.startDate && i.endDate)
      .map(i => ({
        vehicleId: i.vehicleId,
        startDate: new Date(i.startDate as string),
        endDate: new Date(i.endDate as string),
        price: i.pricePerDay,
      }));

    if (vehicles.length === 0) {
      alert('Please set dates for at least one vehicle');
      return;
    }

    const payload = {
      userId: user.id,
      vehicles,
      totalPrice: this.total(),
    };

    this.isSubmitting = true;
    this.http.post('http://localhost:3000/booking', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.auth.getToken()}`,
      }
    }).subscribe({
      next: () => {
        this.cart.clear();
        this.refresh();
        this.message = 'Booking placed successfully';
        this.router.navigate(['/customer-dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.message = 'Failed to place booking';
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
