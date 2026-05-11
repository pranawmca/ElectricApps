import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { CompanyService } from '../../company/services/company.service';
import { environment } from '../../../enviornments/environment';
import { MatDialog } from '@angular/material/dialog';
import { InventoryService } from '../../inventory/service/inventory.service';
import { NotificationService } from '../../shared/notification.service';
import { ProductSelectionDialogComponent } from '../../../shared/components/product-selection-dialog/product-selection-dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { AuthService } from '../../../core/services/auth.service';
import { SupplierService } from '../../inventory/service/supplier.service';
import { UnitService } from '../../master/units/services/units.service';
import { LocationService } from '../../master/locations/services/locations.service';
import { DateHelper } from '../../../shared/models/date-helper';
import { Observable, map, startWith } from 'rxjs';

@Component({
  selector: 'app-purchase-invoice',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './purchase-invoice.html',
  styleUrl: './purchase-invoice.scss',
})
export class PurchaseInvoice implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private dialog = inject(MatDialog);
  public inventoryService = inject(InventoryService);
  private notification = inject(NotificationService);
  private authService = inject(AuthService);
  private supplierService = inject(SupplierService);
  private unitService = inject(UnitService);
  private locationService = inject(LocationService);
  private router = inject(Router);

  isSaving = false;
  isQuick = true;
  signatureImageUrl: string | null = null;
  
  suppliers: any[] = [];
  units: any[] = [];
  warehouses: any[] = [];
  racksByItem: any[][] = [];
  filteredSuppliers!: Observable<any[]>;
  filteredUnits: Observable<any[]>[] = [];
  supplierSearchCtrl = new FormControl<any>('');
  warehouseSearchCtrl = new FormControl('');

  invoiceForm = this.fb.group({
    documentType: ['Tax Invoice'], // 'Tax Invoice' or 'Bill of Supply'
    companyName: [''],
    companyAddress: [''],
    companyGSTIN: [''],
    companyPAN: [''],
    companyCIN: [''],
    
    invoiceNo: ['PI-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')],
    invoiceDate: [new Date(), Validators.required],
    expectedDeliveryDate: [new Date(), Validators.required],
    remarks: [''],
    
    supplierId: ['', Validators.required],
    supplierName: [''],
    supplierPhone: [''],
    supplierAddress: [''],
    supplierGSTIN: [''],
    
    items: this.fb.array([]),
    subTotal: [{ value: 0, disabled: true }],
    totalTax: [{ value: 0, disabled: true }],
    total: [{ value: 0, disabled: true }]
  });

  constructor() {
    this.addItem();
  }

  ngOnInit(): void {
    this.isQuick = this.router.url.includes('quick-inventory');
    this.loadCompanyProfile();
    this.loadSuppliers();
    this.loadUnits();
    this.loadWarehouses();
    
    // Listen for Document Type changes
    this.invoiceForm.get('documentType')?.valueChanges.subscribe(val => {
      this.items.controls.forEach(control => {
        const taxCtrl = control.get('taxRate');
        if (val === 'Bill of Supply') {
          taxCtrl?.setValue(0);
          taxCtrl?.disable();
        } else {
          taxCtrl?.enable();
        }
        this.update(this.items.controls.indexOf(control));
      });
    });
  }

  loadSuppliers(): void {
    this.supplierService.getSuppliers().subscribe((res: any) => {
      this.suppliers = res || [];
      
      this.filteredSuppliers = this.supplierSearchCtrl.valueChanges.pipe(
        startWith(''),
        map(value => {
          const name = typeof value === 'string' ? value : value?.name;
          return name ? this._filterSuppliers(name) : this.suppliers.slice();
        })
      );
    });
  }

  private _filterSuppliers(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.suppliers.filter(s => 
      (s.name || '').toLowerCase().includes(filterValue) || 
      (s.phone || '').includes(filterValue)
    );
  }

  displaySupplierFn(supplier: any): string {
    return supplier && supplier.name ? supplier.name : '';
  }

  onSupplierSelected(event: any): void {
    const supplier = event.option.value;
    this.invoiceForm.patchValue({
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone || '',
      supplierAddress: supplier.address || '',
      supplierGSTIN: supplier.gstIn || 'Unregistered'
    });
  }

  clearSupplier(): void {
    this.supplierSearchCtrl.setValue('');
    this.invoiceForm.patchValue({
      supplierId: '',
      supplierName: '',
      supplierPhone: '',
      supplierAddress: '',
      supplierGSTIN: ''
    });
  }

  loadUnits(): void {
    this.unitService.getAll().subscribe((res: any) => {
      this.units = res as any[];
    });
  }

  loadWarehouses(): void {
    this.locationService.getWarehouses().subscribe((res: any) => {
      this.warehouses = res || [];
    });
  }

  getFilteredWarehouses(searchVal: any): any[] {
    const filterValue = typeof searchVal === 'string' ? searchVal.toLowerCase() : '';
    if (!filterValue) {
      return this.warehouses;
    }
    return this.warehouses.filter(wh => (wh.name || '').toLowerCase().includes(filterValue));
  }

  loadCompanyProfile(): void {
    this.companyService.getCompanyProfile().subscribe({
      next: (profile: any) => {
        if (profile) {
          const primaryAddr = profile.addresses?.find((a: any) => a.isHeadOffice) || profile.addresses?.[0];
          const fullAddress = primaryAddr ? `${primaryAddr.addressLine1}, ${primaryAddr.addressLine2 ? primaryAddr.addressLine2 + ', ' : ''}${primaryAddr.city}, ${primaryAddr.state} - ${primaryAddr.pinCode}` : '';
          
          let pan = '';
          if (profile.gstin && profile.gstin.length >= 12) {
            pan = profile.gstin.substring(2, 12);
          }

          const signatory = profile.authorizedSignatories?.find((s: any) => s.isDefault) || profile.authorizedSignatories?.[0];
          if (signatory?.signatureImageUrl) {
            if (signatory.signatureImageUrl.startsWith('http')) {
              this.signatureImageUrl = signatory.signatureImageUrl;
            } else {
              const cleanUrl = signatory.signatureImageUrl.startsWith('/') ? signatory.signatureImageUrl.substring(1) : signatory.signatureImageUrl;
              this.signatureImageUrl = `${environment.CompanyRootUrl}/${cleanUrl}`;
            }
          }

          this.invoiceForm.patchValue({
            companyName: profile.name,
            companyAddress: fullAddress,
            companyGSTIN: profile.gstin,
            companyPAN: pan,
            companyCIN: profile.registrationNumber
          });
        }
      },
      error: (err: any) => console.error('Error loading company profile:', err)
    });
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  createItem() {
    return this.fb.group({
      description: ['', Validators.required],
      sacHsn: [''],
      qty: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]], 
      discount: [0],
      taxRate: [{ 
        value: this.invoiceForm?.get('documentType')?.value === 'Bill of Supply' ? 0 : 18, 
        disabled: this.invoiceForm?.get('documentType')?.value === 'Bill of Supply' 
      }], 
      taxableValue: [{ value: 0, disabled: true }],
      taxAmount: [{ value: 0, disabled: true }],
      amount: [{ value: 0, disabled: true }], 
      
      productId: [null, Validators.required],
      warehouseId: [null, Validators.required],
      rackId: [null, Validators.required],
      mfgDate: [null],
      expDate: [null],
      unit: ['PCS']
    });
  }

  addItem(): void {
    const index = this.items.length;
    this.items.push(this.createItem());
    this.setupUnitFilter(index);
    this.racksByItem[index] = [];
    
    // Default warehouse selection if only one exists
    if (this.warehouses.length === 1) {
      this.items.at(index).get('warehouseId')?.setValue(this.warehouses[0].id);
      this.onWarehouseChange(index, this.warehouses[0].id);
    }
  }

  onWarehouseChange(index: number, warehouseId: string): void {
    if (!warehouseId) {
      this.racksByItem[index] = [];
      this.items.at(index).get('rackId')?.setValue(null);
      return;
    }
    this.locationService.getRacksByWarehouse(warehouseId).subscribe((res: any) => {
      const racks = res?.data || res || [];
      this.racksByItem[index] = racks;
      if (racks && racks.length > 0) {
        this.items.at(index).get('rackId')?.setValue(racks[0].id);
      } else {
        this.items.at(index).get('rackId')?.setValue(null);
      }
    });
  }

  private setupUnitFilter(index: number): void {
    const unitCtrl = this.items.at(index).get('unit');
    if (unitCtrl) {
      this.filteredUnits[index] = unitCtrl.valueChanges.pipe(
        startWith(''),
        map(value => this._filterUnits(value || ''))
      );
    }
  }

  private _filterUnits(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.units.filter(u => 
      (u.unitName || u.name || '').toLowerCase().includes(filterValue)
    );
  }

  removeItem(i: number): void {
    this.items.removeAt(i);
    this.racksByItem.splice(i, 1);
    this.calculate();
  }

  update(i: number): void {
    const row = this.items.at(i);
    const qty = row.get('qty')?.value ?? 0;
    const unitPrice = row.get('unitPrice')?.value ?? 0;
    const discount = row.get('discount')?.value ?? 0;
    const taxRate = row.get('taxRate')?.value ?? 0;

    const grossAmount = qty * unitPrice;
    const amountAfterDiscount = grossAmount - discount;
    const taxableValue = amountAfterDiscount / (1 + (taxRate / 100));
    const taxAmount = amountAfterDiscount - taxableValue;

    row.get('taxableValue')?.setValue(Number(taxableValue.toFixed(2)), { emitEvent: false });
    row.get('taxAmount')?.setValue(Number(taxAmount.toFixed(2)), { emitEvent: false });
    row.get('amount')?.setValue(Number(amountAfterDiscount.toFixed(2)), { emitEvent: false });
    
    this.calculate();
  }

  calculate(): void {
    let subTotal = 0;
    let totalTax = 0;
    let total = 0;

    this.items.controls.forEach(control => {
      subTotal += control.get('taxableValue')?.value ?? 0;
      totalTax += control.get('taxAmount')?.value ?? 0;
      total += control.get('amount')?.value ?? 0;
    });

    this.invoiceForm.get('subTotal')?.setValue(Number(subTotal.toFixed(2)));
    this.invoiceForm.get('totalTax')?.setValue(Number(totalTax.toFixed(2)));
    this.invoiceForm.get('total')?.setValue(Number(total.toFixed(2)));
  }

  openProductPopup(i: number): void {
    const dialogRef = this.dialog.open(ProductSelectionDialogComponent, {
      width: '1250px',
      maxWidth: '96vw',
      data: { 
        mode: 'purchase',
        allowOutOfStock: true 
      }
    });

    dialogRef.afterClosed().subscribe((selectedProducts: any[]) => {
      const product = Array.isArray(selectedProducts) ? selectedProducts[0] : selectedProducts;
      if (product) {
        this.selectProductItem(i, product);
      }
    });
  }

  private selectProductItem(index: number, product: any): void {
    const row = this.items.at(index);
    const productName = product.productName || product.name || '';
    const productId = product.id || product.productId;

    row.patchValue({
      productId: productId,
      unit: product.unit || 'PCS',
      description: productName,
      sacHsn: product.hsnCode || product.sacHsn || '',
      unitPrice: product.purchaseRate || product.purchasePrice || product.rate || 0,
      taxRate: this.invoiceForm.get('documentType')?.value === 'Bill of Supply' ? 0 : (product.gstPercent || product.defaultGst || 18)
    });

    this.update(index);
  }

  saveAndPrint(): void {
    if (this.invoiceForm.invalid) {
      this.notification.showStatus(false, 'Please fill all required fields before saving.');
      this.invoiceForm.markAllAsTouched();
      return;
    }

    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Purchase Invoice',
        message: 'Are you sure you want to save this Purchase Invoice? This will automatically receive stock into your warehouse.',
        confirmText: 'Yes, Save & Receive',
        confirmColor: 'primary'
      }
    });

    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeSave();
      }
    });
  }

  private executeSave(): void {
    this.isSaving = true;
    const formVal = this.invoiceForm.getRawValue();
    
    // 1. Prepare Purchase Order (PO) Payload of type PurchaseOrderPayload
    const poPayload = {
      id: '00000000-0000-0000-0000-000000000000',
      supplierId: formVal.supplierId || '',
      supplierName: formVal.supplierName || '',
      priceListId: '00000000-0000-0000-0000-000000000000', // Standard or empty price list
      poDate: DateHelper.toLocalISOString(formVal.invoiceDate) || '',
      expectedDeliveryDate: DateHelper.toLocalISOString(formVal.expectedDeliveryDate) || '',
      poNumber: 'AUTO-GEN', 
      remarks: formVal.remarks || `Purchase Invoice generated from Designer. Invoice No: ${formVal.invoiceNo}`,
      totalTax: Number(formVal.totalTax || 0),
      grandTotal: Number(formVal.total || 0),
      createdBy: String(this.authService.getUserEmail() || ''),
      items: formVal.items.map((item: any) => ({
        productId: String(item.productId || ''),
        qty: Number(item.qty || 0),
        unit: String(item.unit || 'PCS'),
        rate: Number(item.unitPrice || 0),
        discountPercent: Number(item.discount || 0),
        gstPercent: Number(item.taxRate || 0),
        taxAmount: Number(item.taxAmount || 0),
        total: Number(item.amount || 0)
      }))
    };

    // Save PO first, then save GRN
    this.inventoryService.savePoDraft(poPayload).subscribe({
      next: (poRes: any) => {
        const poId = poRes.id;
        const poNo = poRes.poNumber;
        
        // Prepare GRN Payload
        const grnPayload = {
          poHeaderId: poId,
          supplierId: formVal.supplierId || '',
          gatePassNo: null,
          receivedDate: new Date().toISOString(),
          remarks: `GRN created automatically from Purchase Invoice. Invoice No: ${formVal.invoiceNo}`,
          totalAmount: Number(formVal.total || 0),
          status: 'Received',
          isQuick: this.isQuick,
          createdBy: String(this.authService.getUserEmail() || ''),
          companyId: String(this.authService.getCompanyId() || ''),
          branchId: String(this.authService.getBranchId() || ''),
          items: formVal.items.map((item: any) => ({
            productId: String(item.productId || ''),
            orderedQty: Number(item.qty || 0),
            receivedQty: Number(item.qty || 0),
            pendingQty: 0,
            rejectedQty: 0,
            acceptedQty: Number(item.qty || 0),
            unitRate: Number(item.unitPrice || 0),
            discountPercent: Number(item.discount || 0),
            gstPercent: Number(item.taxRate || 0),
            taxAmount: Number(item.taxAmount || 0),
            totalAmount: Number(item.amount || 0),
            isReplacement: false,
            warehouseId: String(item.warehouseId || ''),
            rackId: String(item.rackId || ''),
            manufacturingDate: item.mfgDate ? DateHelper.toLocalISOString(item.mfgDate) : null,
            expiryDate: item.expDate ? DateHelper.toLocalISOString(item.expDate) : null,
            batchNumber: String(poNo || '')
          }))
        };

        this.inventoryService.saveGRN(grnPayload).subscribe({
          next: () => {
            this.isSaving = false;
            this.invoiceForm.get('invoiceNo')?.setValue(formVal.invoiceNo);
            
            const statusRef = this.dialog.open(StatusDialogComponent, {
              width: '380px',
              data: {
                title: 'Success',
                message: 'Purchase Invoice and Stock received successfully!',
                isSuccess: true,
                confirmText: 'OK'
              }
            });

            statusRef.afterClosed().subscribe(() => {
              setTimeout(() => window.print(), 300);
              this.router.navigate([this.isQuick ? '/app/quick-inventory' : '/app/inventory']);
            });
          },
          error: (grnErr: any) => {
            this.isSaving = false;
            this.notification.showStatus(false, 'Failed to save GRN stock: ' + (grnErr.error?.message || grnErr.message));
          }
        });
      },
      error: (poErr: any) => {
        this.isSaving = false;
        this.notification.showStatus(false, 'Failed to save purchase invoice details: ' + (poErr.error?.message || poErr.message));
      }
    });
  }

  goBack(): void {
    this.router.navigate([this.isQuick ? '/app/quick-inventory' : '/app/inventory']);
  }
}
