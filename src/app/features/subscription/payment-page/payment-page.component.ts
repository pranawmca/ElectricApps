import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LicenseService } from '../../admin/services/license.service';

declare var Razorpay: any;

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './payment-page.component.html',
  styleUrls: ['./payment-page.component.scss']
})
export class PaymentPageComponent implements OnInit {
  
  private auth = inject(AuthService);
  private licenseService = inject(LicenseService);
  private router = inject(Router);

  plans = [
    {
      id: 'plan_monthly',
      name: 'Monthly Pro',
      price: 999, // Numeric for Razorpay
      displayPrice: '₹999',
      period: 'per month',
      features: ['All Premium Modules', 'Email Support', '5 Users Max', 'Cloud Backup'],
      recommended: false
    },
    {
      id: 'plan_yearly',
      name: 'Yearly Premium',
      price: 9999,
      displayPrice: '₹9,999',
      period: 'per year',
      features: ['Priority 24/7 Support', 'Unlimited Users', 'Custom Reporting', 'Free Updates', 'Data Migration'],
      recommended: true
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  processPayment(plan: any) {
    const options = {
      key: 'rzp_test_YourKeyHere', // User should replace this
      amount: plan.price * 100, // In paise
      currency: 'INR',
      name: 'Enterprise ERP',
      description: `Subscription for ${plan.name}`,
      handler: (response: any) => {
        this.verifyAndActivate(response, plan);
      },
      prefill: {
        name: this.auth.getUserName(),
        email: this.auth.getUserEmail()
      },
      theme: {
        color: '#4f46e5'
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  verifyAndActivate(res: any, plan: any) {
    console.log('Payment Successful:', res);
    
    const payload = {
      userId: localStorage.getItem('userId'),
      paymentId: res.razorpay_payment_id,
      orderId: res.razorpay_order_id,
      signature: res.razorpay_signature,
      planId: plan.id,
      durationDays: plan.id === 'plan_yearly' ? 365 : 30
    };

    this.licenseService.confirmPayment(payload).subscribe({
      next: () => {
        alert('Payment Verified! Your premium access is now active.');
        localStorage.setItem('isSubscriptionExpired', 'false');
        localStorage.setItem('subscriptionStatus', 'Premium');
        this.router.navigate(['/app/dashboard']);
      },
      error: () => {
        alert('Payment verification failed. Please contact support.');
      }
    });
  }

  logout() {
    this.auth.logout();
  }
}
