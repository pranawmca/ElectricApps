import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InventoryService } from '../service/inventory.service';

@Component({
  selector: 'app-rejection-history-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './rejection-history-dialog.component.html',
  styleUrls: ['./rejection-history-dialog.component.scss']
})
export class RejectionHistoryDialogComponent implements OnInit {
  history: any[] = [];
  loading = true;
  errorMessage: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RejectionHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { grnNumber: string },
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = null;
    this.inventoryService.getGrnRejectionHistory(this.data.grnNumber).subscribe({
      next: (res) => {
        this.history = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching rejection history', err);
        this.loading = false;
        this.errorMessage = 'Failed to load history. Please try again.';
      }
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
