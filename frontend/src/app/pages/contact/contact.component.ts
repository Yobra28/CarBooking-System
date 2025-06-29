import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, CreateContactMessageDto } from '../../services/contact.service';

interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface SubmitMessage {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  contactForm: ContactForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  isSubmitting = false;
  submitMessage: SubmitMessage | null = null;
  openFAQ: number | null = null;

  constructor(private contactService: ContactService) {}

  async submitForm() {
    if (!this.contactForm.firstName || !this.contactForm.lastName || 
        !this.contactForm.email || !this.contactForm.subject || !this.contactForm.message) {
      this.submitMessage = {
        type: 'error',
        text: 'Please fill in all required fields.'
      };
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = null;

    try {
      const contactData: CreateContactMessageDto = {
        firstName: this.contactForm.firstName,
        lastName: this.contactForm.lastName,
        email: this.contactForm.email,
        phone: this.contactForm.phone || undefined,
        subject: this.contactForm.subject,
        message: this.contactForm.message
      };

      this.contactService.submitContactForm(contactData).subscribe({
        next: (response) => {
          console.log('Contact form submitted successfully:', response);
          this.submitMessage = {
            type: 'success',
            text: 'Thank you for your message! We will get back to you soon.'
          };
          
          // Reset form
          this.contactForm = {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            subject: '',
            message: ''
          };
        },
        error: (error) => {
          console.error('Error submitting contact form:', error);
          this.submitMessage = {
            type: 'error',
            text: 'Sorry, there was an error sending your message. Please try again.'
          };
        }
      });
      
    } catch (error) {
      this.submitMessage = {
        type: 'error',
        text: 'Sorry, there was an error sending your message. Please try again.'
      };
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleFAQ(index: number) {
    this.openFAQ = this.openFAQ === index ? null : index;
  }
} 