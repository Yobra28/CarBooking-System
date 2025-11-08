import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-kyc-verification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kyc-verification-modal.component.html',
  styleUrls: ['./kyc-verification-modal.component.css']
})
export class KycVerificationModalComponent implements OnInit {
  @Input() userId: string | null = null;
  @Input() userName: string = '';
  @Output() closed = new EventEmitter<void>();
  @Output() approved = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();

  kycData: any = null;
  isLoading = false;
  isProcessing = false;
  error = '';
  imageErrors: { [key: string]: boolean } = {};

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    if (this.userId) {
      this.loadKyc();
    }
  }

  loadKyc() {
    if (!this.userId) return;
    
    this.isLoading = true;
    this.error = '';
    
    this.usersService.getUserKyc(this.userId).subscribe({
      next: (data) => {
        this.kycData = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to load KYC documents';
        this.isLoading = false;
      }
    });
  }

  approveKyc() {
    if (!this.userId || this.isProcessing) return;
    
    this.isProcessing = true;
    this.usersService.approveUserKyc(this.userId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.approved.emit();
        this.close();
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to approve KYC';
        this.isProcessing = false;
      }
    });
  }

  rejectKyc() {
    if (!this.userId || this.isProcessing) return;
    
    if (confirm('Are you sure you want to reject this KYC? The user will need to resubmit.')) {
      this.isProcessing = true;
      this.usersService.rejectUserKyc(this.userId).subscribe({
        next: () => {
          this.isProcessing = false;
          this.rejected.emit();
          this.close();
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to reject KYC';
          this.isProcessing = false;
        }
      });
    }
  }

  close() {
    this.closed.emit();
  }

  onImageError(type: string) {
    this.imageErrors[type] = true;
  }

  getStatusClass(): string {
    if (!this.kycData) return '';
    return this.kycData.isKycVerified 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
  }

  getStatusText(): string {
    if (!this.kycData) return '';
    return this.kycData.isKycVerified ? 'VERIFIED' : 'PENDING';
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'Not yet verified';
    return new Date(date).toLocaleDateString();
  }
}
