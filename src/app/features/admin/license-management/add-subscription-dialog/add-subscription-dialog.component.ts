import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { LicenseService } from '../../services/license.service';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';

@Component({
  selector: 'app-add-subscription-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './add-subscription-dialog.component.html',
  styleUrls: ['./add-subscription-dialog.component.scss']
})
export class AddSubscriptionDialogComponent implements OnInit {
  form: FormGroup;
  users: any[] = [];
  loading = false;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddSubscriptionDialogComponent>);
  private licenseService = inject(LicenseService);
  private dialog = inject(MatDialog);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // We can also use a dropdown of existing users
      planType: ['Trial', Validators.required],
      durationValue: [15, [Validators.required, Validators.min(1)]],
      durationUnit: ['Days', Validators.required]
    });
  }

  ngOnInit(): void {
    // Optionally load existing users who don't have subscriptions
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    const val = this.form.value;
    
    // Calculate total days
    let totalDays = val.durationValue;
    if (val.durationUnit === 'Months') totalDays *= 30;
    if (val.durationUnit === 'Years') totalDays *= 365;

    const payload = {
      email: val.email,
      planType: val.planType,
      durationDays: totalDays
    };

    this.licenseService.onboardCustomer(payload).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'Failed to onboard customer. Please try again.';
        this.dialog.open(StatusDialogComponent, {
          data: { isSuccess: false, message: msg }
        });
      }
    });
  }

  close() {
    this.dialogRef.close();
  }
}
