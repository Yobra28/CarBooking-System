import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'CarRental';
  constructor(private router: Router) {}

  get showNavbar(): boolean {
    // Hide navbar on admin dashboard pages
    const url = this.router.url || '';
    return !url.startsWith('/admin-dashboard');
  }

  get showFooter(): boolean {
    // Hide footer on admin dashboard pages
    const url = this.router.url || '';
    return !url.startsWith('/admin-dashboard');
  }
}
