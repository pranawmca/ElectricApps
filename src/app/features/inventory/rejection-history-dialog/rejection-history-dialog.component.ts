import { Component, Inject, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InventoryService } from '../service/inventory.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-rejection-history-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './rejection-history-dialog.component.html',
  styleUrls: ['./rejection-history-dialog.component.scss']
})
export class RejectionHistoryDialogComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private inventoryService = inject(InventoryService);

  history: any[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RejectionHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { grnNumber: string }
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    console.log('[RejectionHistoryDialog] Loading history for:', this.data.grnNumber);
    this.loading = true;
    this.errorMessage = null;

    this.inventoryService.getGrnRejectionHistory(this.data.grnNumber)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          console.log('[RejectionHistoryDialog] Data received:', res);
          this.history = Array.isArray(res) ? res : [];
        },
        error: (err) => {
          console.error('[RejectionHistoryDialog] Error:', err);
          this.errorMessage = 'Failed to load history. Please try again.';
        }
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
