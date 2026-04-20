import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../material/material/material-module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-reason-reject-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule],
  templateUrl: './reason-reject-dialog.html',
  styleUrl: './reason-reject-dialog.scss',
})
export class ReasonRejectDialog {
  rejectReason: string = ''; // Initial value set to empty [cite: 2026-01-22]

  constructor(
    public dialogRef: MatDialogRef<ReasonRejectDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any // Data inject ho raha hai [cite: 2026-01-22]
  ) {}

  onCancel() { this.dialogRef.close(); }
  onConfirm() { this.dialogRef.close(this.rejectReason.trim()); }
}
