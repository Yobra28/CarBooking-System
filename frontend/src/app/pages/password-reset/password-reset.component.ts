import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService, RequestPasswordResetRequest, ResetPasswordRequest } from '../../services/auth.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css'
})
export class PasswordResetComponent implements OnInit {
  // Step 1: Request reset code
  requestEmail = '';
  isRequestingCode = false;
  codeRequested = false;
  requestError = '';
  requestSuccess = '';

  // Step 2: Enter code and new password
  resetCode = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;
  isResettingPassword = false;
  resetError = '';
  resetSuccess = '';

  // Current step
  currentStep: 'request' | 'reset' = 'request';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Check if we have a code in the URL (from email link)
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.resetCode = params['code'];
        this.currentStep = 'reset';
      }
    });
  }

  // Step 1: Request password reset code
  requestResetCode() {
    if (!this.requestEmail) {
      this.requestError = 'Please enter your email address';
      return;
    }

    this.isRequestingCode = true;
    this.requestError = '';
    this.requestSuccess = '';

    this.authService.requestPasswordReset(this.requestEmail).subscribe({
      next: (response) => {
        this.isRequestingCode = false;
        this.codeRequested = true;
        this.requestSuccess = response.message || 'Password reset code sent to your email';
        this.currentStep = 'reset';
      },
      error: (error) => {
        this.isRequestingCode = false;
        this.requestError = error.error?.message || 'Failed to send reset code. Please try again.';
      }
    });
  }

  // Step 2: Reset password with code
  resetPassword() {
    if (!this.resetCode) {
      this.resetError = 'Please enter the reset code';
      return;
    }

    // Validate that the code is a 6-digit number
    if (!/^\d{6}$/.test(this.resetCode)) {
      this.resetError = 'Please enter a valid 6-digit reset code';
      return;
    }

    if (!this.newPassword) {
      this.resetError = 'Please enter a new password';
      return;
    }

    if (this.newPassword.length < 6) {
      this.resetError = 'Password must be at least 6 characters long';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.resetError = 'Passwords do not match';
      return;
    }

    this.isResettingPassword = true;
    this.resetError = '';
    this.resetSuccess = '';

    this.authService.resetPassword(this.resetCode, this.newPassword).subscribe({
      next: (response) => {
        this.isResettingPassword = false;
        this.resetSuccess = response.message || 'Password reset successful! You can now login with your new password.';
        
        // Redirect to login after a short delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isResettingPassword = false;
        this.resetError = error.error?.message || 'Failed to reset password. Please check your code and try again.';
      }
    });
  }

  // Utility methods
  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goBackToRequest() {
    this.currentStep = 'request';
    this.resetError = '';
    this.resetSuccess = '';
  }

  resendCode() {
    this.requestResetCode();
  }

  // Handle code input validation
  onCodeInput(event: any) {
    const value = event.target.value;
    // Remove non-numeric characters and limit to 6 digits
    this.resetCode = value.replace(/[^0-9]/g, '').slice(0, 6);
  }
} 