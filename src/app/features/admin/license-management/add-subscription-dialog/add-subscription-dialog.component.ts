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
import { NotifyService } from '../../../../core/services/notify.service';

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
    private notify: NotifyService,
    private dialogRef: MatDialogRef<AddSubscriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.brandForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
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
    const onboardData = {
      ...this.brandForm.value,
      planType: this.selectedPlan
    };

    this.companyService.insertCompany(onboardData).subscribe({
      next: (res) => {
        this.notify.success('Customer onboarded and synchronization started successfully!');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notify.error(err.message || 'Onboarding failed. Please check backend logs.');
        this.loading = false;
      }
    });
  }
}
