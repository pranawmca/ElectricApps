import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CompanyService } from '../../company/services/company.service';
import { LocationService } from '../../master/locations/services/locations.service';
import { InventoryService } from '../service/inventory.service';
import { ProductService } from '../../master/product/service/product.service';
import { NotificationService } from '../../shared/notification.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ProductSelectionDialogComponent } from '../../../shared/components/product-selection-dialog/product-selection-dialog';

@Component({
  selector: 'app-item-transfer',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './item-transfer.component.html',
  styleUrl: './item-transfer.component.scss'
})
export class ItemTransferComponent implements OnInit {
  private companyService = inject(CompanyService);
  private locationService = inject(LocationService);
  private inventoryService = inject(InventoryService);
  private productService = inject(ProductService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  branches: any[] = [];
  allWarehouses: any[] = [];
  fromWarehouses: any[] = [];
  toWarehouses: any[] = [];

  fromBranchId: string | null = null;
  fromWarehouseId: string | null = null;
  toBranchId: string | null = null;
  toWarehouseId: string | null = null;

  items: any[] = [];
  filteredProducts: any[] = [];
  remarks: string = '';
  isSaving: boolean = false;

  ngOnInit() {
    this.loadBranches();
    this.loadAllWarehouses();
  }

  loadBranches() {
    this.companyService.getBranches().subscribe(branches => {
      this.branches = (branches || []).map(b => ({
        ...b,
        id: b.id || b.branchId, // Ensure id is present
        name: b.branchName || b.name || b.city || 'Unnamed Branch'
      }));
      this.cdr.detectChanges();
    });
  }

  loadAllWarehouses() {
    this.locationService.getWarehouses().subscribe(data => {
      this.allWarehouses = data || [];
      console.log('All Warehouses Loaded:', this.allWarehouses.length);
      
      if (this.fromBranchId) this.onFromBranchChange();
      if (this.toBranchId) this.onToBranchChange();
      this.cdr.detectChanges();
    });
  }

  onFromBranchChange() {
    console.log('From Branch Selected ID:', this.fromBranchId);
    const selectedBranch = this.branches.find(b => b.id == this.fromBranchId);
    const branchName = selectedBranch?.name || selectedBranch?.branchName;

    if (!this.fromBranchId) {
      this.fromWarehouses = [];
    } else {
      this.fromWarehouses = this.allWarehouses.filter(w => {
        const idMatch = w.branchId == this.fromBranchId || w.id == this.fromBranchId || w.branchId?.toString() === this.fromBranchId?.toString();
        const nameMatch = branchName && (w.branchId === branchName || w.branchName === branchName);
        return idMatch || nameMatch;
      });
      console.log('Filtered From Warehouses:', this.fromWarehouses);
    }
    this.fromWarehouseId = null;
    this.items = [];
    this.cdr.detectChanges();
  }

  onToBranchChange() {
    console.log('To Branch Selected ID:', this.toBranchId);
    const selectedBranch = this.branches.find(b => b.id == this.toBranchId);
    const branchName = selectedBranch?.name || selectedBranch?.branchName;

    if (!this.toBranchId) {
      this.toWarehouses = [];
    } else {
      this.toWarehouses = this.allWarehouses.filter(w => {
        const idMatch = w.branchId == this.toBranchId || w.id == this.toBranchId || w.branchId?.toString() === this.toBranchId?.toString();
        const nameMatch = branchName && (w.branchId === branchName || w.branchName === branchName);
        return idMatch || nameMatch;
      });
      console.log('Filtered To Warehouses:', this.toWarehouses);
    }
    this.toWarehouseId = null;
    this.cdr.detectChanges();
  }

  onFromWarehouseChange() {
    this.items = [];
    this.cdr.detectChanges();
  }

  openProductSelectionDialog() {
    if (!this.fromWarehouseId) {
      this.notification.showStatus(false, 'Please select Source Warehouse first');
      return;
    }

    const dialogRef = this.dialog.open(ProductSelectionDialogComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      data: {
        warehouseId: this.fromWarehouseId,
        existingIds: this.items.filter(i => i.productId).map(i => i.productId),
        allowOutOfStock: false,
        mode: 'transfer'
      },
      disableClose: true,
      panelClass: 'full-screen-modal'
    });

    dialogRef.afterClosed().subscribe(selectedProducts => {
      if (selectedProducts && selectedProducts.length > 0) {
        selectedProducts.forEach((prod: any) => {
          this.items.push({
            productId: prod.productId || prod.id,
            productName: prod.productName || prod.name,
            availableStock: prod.availableStock || prod.stock || 0,
            warehouseId: prod.warehouseId,
            warehouseName: prod.warehouseName,
            rackId: prod.rackId,
            rackName: prod.rackName,
            batchNumber: prod.batchNumber || prod.batchNo,
            quantity: 1,
            unit: prod.unit
          });
        });
        this.cdr.detectChanges();
      }
    });
  }

  addItemRow() {
    this.items.push({
      productId: null,
      productName: '',
      availableStock: 0,
      quantity: 1,
      unit: ''
    });
  }

  removeItemRow(index: number) {
    this.items.splice(index, 1);
  }

  displayProductName(product: any): string {
    return product ? (product.productName || product.name || product) : '';
  }

  searchProducts(item: any, index: number) {
    if (item.productName && item.productName.length > 1) {
      if (!this.fromWarehouseId) {
        this.notification.showStatus(false, 'Please select Source Warehouse first');
        return;
      }
      
      this.inventoryService.getCurrentStock('ProductName', 'asc', 0, 20, item.productName, null, null, this.fromWarehouseId, null, false, this.fromBranchId)
        .subscribe((res: any) => {
          this.filteredProducts = (res.items || []).map((s: any) => ({
            ...s,
            id: s.productId, // Map to id for consistency
            availableStock: s.availableStock || 0
          }));
          this.cdr.detectChanges();
        });
    }
  }

  onProductSelected(event: any, index: number) {
    const selectedProduct = event.option.value;
    if (selectedProduct) {
      this.items[index].productId = selectedProduct.productId || selectedProduct.id;
      this.items[index].productName = selectedProduct.productName;
      this.items[index].unit = selectedProduct.unit;
      this.items[index].availableStock = selectedProduct.availableStock || 0;
      this.items[index].warehouseId = selectedProduct.warehouseId;
      this.items[index].warehouseName = selectedProduct.warehouseName;
      this.items[index].rackId = selectedProduct.rackId;
      this.items[index].rackName = selectedProduct.rackName;
      this.items[index].batchNumber = selectedProduct.batchNumber || selectedProduct.batchNo;
      this.cdr.detectChanges();
    }
  }

  isProductAlreadyAdded(productId: string): boolean {
    return this.items.some(i => i.productId === productId && i.productId !== null);
  }

  isFormValid(): boolean {
    return !!this.fromWarehouseId && 
           !!this.toWarehouseId && 
           this.fromWarehouseId !== this.toWarehouseId &&
           this.items.length > 0 && 
           this.items.every(i => i.productId && i.quantity > 0 && i.quantity <= i.availableStock);
  }

  saveTransfer() {
    if (!this.isFormValid()) return;

    this.isSaving = true;
    const request = {
      fromWarehouseId: this.fromWarehouseId,
      toWarehouseId: this.toWarehouseId,
      fromBranchId: this.fromBranchId,
      toBranchId: this.toBranchId,
      remarks: this.remarks,
      items: this.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        batchNumber: i.batchNumber || i.batchNo // Capture batch if available
      }))
    };

    this.inventoryService.createTransfer(request).subscribe({
      next: (res: any) => {
        this.notification.showStatus(true, 'Stock transfer completed successfully!');
        this.router.navigate(['/app/inventory/current-stock']);
      },
      error: (err: any) => {
        this.notification.showStatus(false, err.error?.message || 'Failed to complete transfer');
        this.isSaving = false;
      }
    });
  }
}
