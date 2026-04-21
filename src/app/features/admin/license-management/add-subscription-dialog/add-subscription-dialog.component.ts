import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CompanyService } from '../../../../features/company/services/company.service';
import { UpsertCompanyRequest } from '../../../../features/company/model/company.model';
import { LicenseService } from '../../services/license.service';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-add-subscription-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatStepperModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-subscription-dialog.component.html',
  styleUrls: ['./add-subscription-dialog.component.scss']
})
export class AddSubscriptionDialogComponent implements OnInit {
  brandForm: FormGroup;
  planForm: FormGroup;
  selectedPlan: string = 'TRIAL';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private licenseService: LicenseService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<AddSubscriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.brandForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      companyCode: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['']
    });

    this.planForm = this.fb.group({
      plan: ['TRIAL', Validators.required]
    });
  }

  ngOnInit(): void {}

  setPlan(plan: string) {
    this.selectedPlan = plan;
    this.planForm.patchValue({ plan: plan });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.brandForm.invalid) return;

    this.loading = true;

    // 1. Prepare DTO-compliant payload for Company API (Strictly following UpsertCompanyRequest)
    const companyPayload: UpsertCompanyRequest = {
      name: this.brandForm.value.name,
      companyCode: (this.brandForm.value.companyCode || '').toUpperCase().replace(/\s/g, ''),
      tagline: '',
      registrationNumber: "TEMP-123", // Required by Backend
      gstin: "07AAAAA0000A1Z5",       // Required by Backend
      logoUrl: null,
      primaryEmail: this.brandForm.value.email,
      primaryPhone: this.brandForm.value.phone,
      website: '',
      message: null,
      driverWhatsAppMessage: null,
      purchaseOrderCreationMessage: null,
      purchaseOrderStatusUpdateMessage: null,
      saleOrderCreationMessage: null,
      saleOrderConfirmationMessage: null,
      smtpEmail: null,
      smtpPassword: null,
      smtpHost: null,
      smtpPort: null,
      smtpUseSsl: false,
      saleReturnWindowValue: 0,
      saleReturnWindowUnit: 'Days',
      purchaseReturnWindowValue: 0,
      purchaseReturnWindowUnit: 'Days',
      invoiceFooterMessage: null,
      estimateFooterMessage: null,
      purchaseOrderFooterMessage: null,
      saleOrderFooterMessage: null,
      addresses: [
        {
          id: '',
          branchName: 'Main Office',
          addressLine1: this.brandForm.value.address || "Main Office",
          addressLine2: '',
          city: "City",
          state: "State",
          stateCode: "00",
          pinCode: "000000",
          country: "India",
          isHeadOffice: true
        }
      ],
      bankInfo: {
        id: '',
        bankName: "System Bank",
        branchName: '',
        accountNumber: "0000000000",
        ifscCode: "TEMP0001",
        accountType: "Current"
      },
      authorizedSignatories: []
    };

    // 🚀 STEP 1: Create Company Profile
    this.companyService.insertCompany(companyPayload).subscribe({
      next: (companyId: any) => {
        
        // 🚀 STEP 2: Activate Subscription in Identity Service
        const subscriptionPayload = {
          companyId: companyId,
          companyName: companyPayload.name,
          companyCode: companyPayload.companyCode,
          planType: this.selectedPlan,
          durationDays: 30, // Default for onboarding
          email: companyPayload.primaryEmail
        };

        this.licenseService.onboardCustomer(subscriptionPayload).subscribe({
          next: () => {
             this.loading = false;
             // removed redundant showStatus - parent LicenseManagementComponent handles this
             this.dialogRef.close(true);
          },
          error: (err) => {
             this.loading = false;
             this.showStatus(false, 'Company created, but subscription sync failed. Please check Identity Logs.');
          }
        });
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Onboarding failed due to API validation error (400).';
        this.showStatus(false, msg);
      }
    });
  }

  private showStatus(success: boolean, message: string): void {
    this.dialog.open(StatusDialogComponent, {
      data: { isSuccess: success, message: message }
    });
  }
}
