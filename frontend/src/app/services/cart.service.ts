import { Injectable } from '@angular/core';
import { Vehicle } from './vehicle.service';

export interface CartItem {
  vehicleId: string;
  name: string;
  image: string;
  pricePerDay: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

const CART_KEY = 'cart_items';

@Injectable({ providedIn: 'root' })
export class CartService {
  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) as CartItem[] : [];
    } catch {
      return [];
    }
  }

  private save(items: CartItem[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  getItems(): CartItem[] {
    return this.load();
  }

  addVehicle(v: Vehicle) {
    const items = this.load();
    // Avoid duplicates of same vehicle; allow multiple entries if desired - here prevent dup
    if (!items.find(i => i.vehicleId === v.id)) {
      items.push({
        vehicleId: v.id,
        name: v.name,
        image: v.images || 'assets/pexels-mayday-1545743.jpg',
        pricePerDay: v.pricePerDay,
      });
      this.save(items);
    }
  }

  updateDates(vehicleId: string, startDate?: string, endDate?: string) {
    const items = this.load();
    const item = items.find(i => i.vehicleId === vehicleId);
    if (item) {
      item.startDate = startDate;
      item.endDate = endDate;
      this.save(items);
    }
  }

  remove(vehicleId: string) {
    const items = this.load().filter(i => i.vehicleId !== vehicleId);
    this.save(items);
  }

  clear() {
    localStorage.removeItem(CART_KEY);
  }

  daysFor(item: CartItem): number {
    if (!item.startDate || !item.endDate) return 0;
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  itemTotal(item: CartItem): number {
    return this.daysFor(item) * item.pricePerDay;
  }

  grandTotal(): number {
    return this.getItems().reduce((sum, it) => sum + this.itemTotal(it), 0);
  }
}
