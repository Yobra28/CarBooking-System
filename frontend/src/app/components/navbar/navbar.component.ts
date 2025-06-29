import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  isMobileMenuOpen = false;
  currentUser: User | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  logout() {
    this.authService.logout();
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  get userEmail(): string {
    return this.currentUser?.email || '';
  }

  get userRole(): string {
    return this.currentUser?.role || '';
  }

  getDashboardLink(): string {
    const user = this.currentUser;
    switch (user?.role) {
      case 'ADMIN':
        return '/admin-dashboard';
      case 'AGENT':
        return '/agent-dashboard';
      case 'CUSTOMER':
        return '/customer-dashboard';
      default:
        return '/';
    }
  }

  getDashboardName(): string {
    const user = this.currentUser;
    switch (user?.role) {
      case 'ADMIN':
        return 'Admin Dashboard';
      case 'AGENT':
        return 'Agent Dashboard';
      case 'CUSTOMER':
        return 'My Dashboard';
      default:
        return 'Dashboard';
    }
  }
}
