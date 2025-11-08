import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { CarDetailsComponent } from './pages/car-details/car-details.component';
import { BookingComponent } from './pages/booking/booking.component';
import { VehiclesComponent } from './pages/vehicles/vehicles.component';
import { ContactComponent } from './pages/contact/contact.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AgentDashboardComponent } from './pages/agent-dashboard/agent-dashboard.component';
import { CustomerDashboardComponent } from './pages/customer-dashboard/customer-dashboard.component';
import { PasswordResetComponent } from './pages/password-reset/password-reset.component';
import { CartComponent } from './pages/cart/cart.component';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

// Route guard function
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Redirect to login with return URL
    const currentUrl = router.url;
    router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
    return false;
  }
};

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'vehicles', component: VehiclesComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'car/:id', component: CarDetailsComponent },
  { path: 'booking/:carId', component: BookingComponent, canActivate: [authGuard] },
  { path: 'cart', component: CartComponent, canActivate: [authGuard] },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'agent-dashboard', component: AgentDashboardComponent },
  { path: 'customer-dashboard', component: CustomerDashboardComponent },
  { path: 'password-reset', component: PasswordResetComponent },
];
