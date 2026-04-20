import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { InventoryService } from '../service/inventory.service';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-po-selection-dialog',
  imports: [MaterialModule, CommonModule],
  templateUrl: './po-selection-dialog.html',
  styleUrl: './po-selection-dialog.scss',
})
export class PoSelectionDialog implements OnInit {
  pendingPOs: any[] = [];
  isLoading = false;

  displayedColumns: string[] = ['poNumber', 'supplierName', 'poDate', 'status', 'select'];

  constructor(
    private inventoryService: InventoryService,
    private dialogRef: MatDialogRef<PoSelectionDialog>,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadPendingPOs();
  }

  loadPendingPOs() {
    this.isLoading = true;
    this.inventoryService.getPendingPurchaseOrders().subscribe({
      next: (data) => {
        // Backend agar null bheje toh empty array set karein
        this.pendingPOs = data ?? [];
        this.isLoading = false; // [cite: 2026-01-22]
        console.log('POs loaded:', data);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('API Error:', err);
        this.isLoading = false; // Error state mein bhi loader band hona chahiye
        this.pendingPOs = [];
        this.cdr.detectChanges();
      }
    });
  }



  onSelect(po: any) {
    // Selected PO ka data wapas GrnListComponent ko bhej rahe hain
    this.dialogRef.close(po);
  }
}
