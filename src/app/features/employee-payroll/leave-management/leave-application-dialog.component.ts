import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-leave-application-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './leave-application-dialog.component.html',
  styleUrl: './leave-application-dialog.component.scss'
})
export class LeaveApplicationDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<LeaveApplicationDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);

  leaveForm!: FormGroup;
  leaveTypes = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Compensatory Off'];

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.leaveForm = this.fb.group({
      leaveType: ['', Validators.required],
      startDate: [new Date(), Validators.required],
      endDate: [new Date(), Validators.required],
      reason: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.leaveForm.valid) {
      this.dialogRef.close(this.leaveForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
