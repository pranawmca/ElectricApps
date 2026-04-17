import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MatStepperModule } from '@angular/material/stepper';
import { CompanyService } from '../../company/services/company.service';
import { LicenseService } from '../services/license.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-onboard-customer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatStepperModule],
  templateUrl: './onboard-customer.component.html',
  styleUrls: ['./onboard-customer.component.scss']
})
export class OnboardCustomerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private licenseService = inject(LicenseService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private loadingService = inject(LoadingService);

  brandForm!: FormGroup;
  subscriptionForm!: FormGroup;
  legalForm!: FormGroup;

  createdCompanyId: string | null = null;
  loading = false;

  ngOnInit(): void {
    this.initForms();
  }

  initForms(): void {
    this.brandForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      tagline: [''],
      primaryEmail: ['', [Validators.required, Validators.email]],
      primaryPhone: ['', [Validators.required]]
    });

    this.subscriptionForm = this.fb.group({
      planType: ['Trial', Validators.required],
      durationValue: [15, [Validators.required, Validators.min(1)]],
      durationUnit: ['Days', Validators.required]
    });

    this.legalForm = this.fb.group({
      gstin: ['', [Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]],
      pan: ['', [Validators.pattern(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)]],
      address: [''],
      city: [''],
      state: [''],
      bankName: [''],
      accountNumber: [''],
      ifscCode: ['']
    });
  }

  onBrandSubmit(): void {
    if (this.brandForm.invalid) return;

    this.loading = true;
    this.loadingService.setLoading(true);
    
    // Create basic profile first to get GUID
    const payload = {
       ...this.brandForm.value,
       isActive: true
    };

    this.companyService.insertCompany(payload).subscribe({
       next: (id: any) => {
          this.createdCompanyId = id;
          this.loading = false;
          this.loadingService.setLoading(false);
          this.cdr.detectChanges();
          // Move to next step automatically in HTML via [linear]
       },
       error: (err) => {
          this.loading = false;
          this.loadingService.setLoading(false);
          this.showStatus(false, err?.error?.message || 'Unable to create company profile');
       }
    });
  }

  onOnboardSubmit(): void {
    if (this.subscriptionForm.invalid || !this.createdCompanyId) return;

    this.loading = true;
    this.loadingService.setLoading(true);
    
    const val = this.subscriptionForm.value;
    let days = val.durationValue;
    if (val.durationUnit === 'Months') days *= 30;
    if (val.durationUnit === 'Years') days *= 365;

    const payload = {
       companyId: this.createdCompanyId,
       companyName: this.brandForm.value.name,
       email: this.brandForm.value.primaryEmail,
       planType: val.planType,
       durationDays: days
    };

    this.licenseService.onboardCustomer(payload).subscribe({
       next: () => {
          this.loading = false;
          this.loadingService.setLoading(false);
          this.cdr.detectChanges();
       },
       error: (err) => {
          this.loading = false;
          this.loadingService.setLoading(false);
          this.showStatus(false, err?.error?.message || 'Subscription activation failed');
       }
    });
  }

  onFinalSubmit(): void {
    if (this.legalForm.invalid || !this.createdCompanyId) return;

    this.loading = true;
    this.loadingService.setLoading(true);

    this.companyService.updateCompany(this.createdCompanyId, this.legalForm.value).subscribe({
       next: () => {
          this.loading = false;
          this.loadingService.setLoading(false);
          this.showStatus(true, 'Tenant Onboarding Completed Successfully!');
          this.router.navigate(['/app/admin/companies']);
       },
       error: (err) => {
          this.loading = false;
          this.loadingService.setLoading(false);
          this.showStatus(false, 'Legal details update failed, but company is onboarded.');
          this.router.navigate(['/app/admin/companies']);
       }
    });
  }

  private showStatus(success: boolean, message: string): void {
    this.dialog.open(StatusDialogComponent, {
      data: { isSuccess: success, message: message }
    });
  }
}
