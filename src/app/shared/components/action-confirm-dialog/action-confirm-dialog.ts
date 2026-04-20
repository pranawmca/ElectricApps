import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../material/material/material-module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-action-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './action-confirm-dialog.html',
  styleUrl: './action-confirm-dialog.scss',
})
export class ActionConfirmDialog {
  constructor(
    public dialogRef: MatDialogRef<ActionConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string,
      message: string,
      confirmText: string,
      confirmColor: string
    }
  ) { }

  onNoClick(): void {
    this.dialogRef.close(false); // Cancel click par false return karega [cite: 2026-01-22]
  }
}
