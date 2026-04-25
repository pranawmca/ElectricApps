import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { InventoryService } from '../service/inventory.service';
import { ProductService } from '../../master/product/service/product.service';
import { NotificationService } from '../../shared/notification.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, finalize, catchError, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ProductSelectionDialogComponent } from '../../../shared/components/product-selection-dialog/product-selection-dialog';
import { PermissionService } from '../../../core/services/permission.service';
import { SupplierModalComponent } from '../supplier-modal/supplier-modal';
import { SupplierService } from '../service/supplier.service';
import { UnitService } from '../../master/units/services/units.service';
import { LocationService } from '../../master/locations/services/locations.service';
import { MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { DateHelper } from '../../../shared/models/date-helper';
import { POService } from '../service/po.service';
import { BarcodeReaderHelper } from '../../../shared/barcode-reader-helper/barcode-reader-helper.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductForm } from '../../master/product/product-form/product-form';
import { SharedPrintService } from '../../../core/services/shared-print.service';
import { LocationTrackerDialogComponent } from '../purchase-return/location-tracker-dialog/location-tracker-dialog.component';
import { LoadingService } from '../../../core/services/loading.service';

// 🎯 Custom Native Date Adapter to force dd/mm/yy format
export class CustomDateAdapter extends NativeDateAdapter {
    override format(date: Date, displayFormat: Object): string {
        if (displayFormat === 'input') {
            const day = ('0' + date.getDate()).slice(-2);
            const month = ('0' + (date.getMonth() + 1)).slice(-2);
            const year = date.getFullYear().toString().slice(-2);
            return `${day}/${month}/${year}`;
        }
        return date.toLocaleDateString();
    }
}

export const MY_DATE_FORMATS = {
    parse: {
        dateInput: { month: 'short', year: 'numeric', day: 'numeric' },
    },
    display: {
        dateInput: 'input',
        monthYearLabel: { year: 'numeric', month: 'short' },
        dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
        monthYearA11yLabel: { year: 'numeric', month: 'long' },
    },
};

@Component({
    selector: 'app-quick-purchase',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule],
    templateUrl: './quick-purchase.component.html',
    styleUrl: './quick-purchase.component.scss',
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
    ],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.5)' }),
                animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.5)' }))
            ])
        ])
    ]
})
export class QuickPurchaseComponent implements OnInit, OnDestroy, AfterViewInit {
    private fb = inject(FormBuilder);
    public inventoryService = inject(InventoryService);
    private notification = inject(NotificationService);
    public router = inject(Router);
    private authService = inject(AuthService);
    private dialog = inject(MatDialog);
    private permissionService = inject(PermissionService);
    private supplierService = inject(SupplierService);
    private unitService = inject(UnitService);
    private locationService = inject(LocationService);
    private productService = inject(ProductService);
    private poService = inject(POService);
    private route = inject(ActivatedRoute);
    private barcodeHelper = inject(BarcodeReaderHelper);
    private cdr = inject(ChangeDetectorRef);
    private sharedPrintService = inject(SharedPrintService);
    private loadingService = inject(LoadingService);
    private destroy$ = new Subject<void>();

    poForm!: FormGroup;
    suppliers: any[] = [];
    allUnits: any[] = [];
    warehouses: any[] = [];
    racksByItem: any[][] = []; 
    priceLists: any[] = [];
    filteredUnits: Observable<any[]>[] = [];
    filteredProducts: Observable<any[]>[] = [];
    isProductLoading: boolean[] = [];
    isScanning = false;
    lastScannedCode = '';
    isLoading = false;
    isSaving = false;
    isLoadingSuppliers = false;
    isLoadingPriceLists = false;
    isPriceListAutoSelected = false;
    isEditMode = false;
    poId: any = null;
    currentStatus = '';
    selectedSupplierIsUnregistered = false;
    isAtTop = true;
    private scrollContainer: HTMLElement | null = null;
    private scrollListener: any;
    today = new Date();
    minDate = new Date();
    isReorder = false;
    reorderTooltipText = 'Items pre-filled from Reorder recommendations';

    onScroll() {
        if (this.scrollContainer) {
            const { scrollTop } = this.scrollContainer;
            this.isAtTop = scrollTop < 50;
            this.cdr.detectChanges();
        }
    }

    toggleScroll() {
        if (this.scrollContainer) {
            if (this.isAtTop) {
                this.scrollContainer.scrollTo({ top: this.scrollContainer.scrollHeight, behavior: 'smooth' });
            } else {
                this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }

    goBack() {
        this.router.navigate(['/app/quick-inventory/purchase/list']);
    }

    constructor() {
        this.initForm();
    }

    ngOnInit() {
        this.loadSuppliers();
        this.loadUnits();
        this.loadWarehouses();
        this.bindDropdownPriceList();
        this.initBarcodeListener();

        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== '00000000-0000-0000-0000-000000000000' && id !== '') {
            this.poId = id;
            this.isEditMode = true;
            this.loadPODetails(id);
        } else {
            this.loadNextPoNumber();
            setTimeout(() => {
                const state = window.history.state;
                if (state?.refillData) {
                    this.isReorder = true;
                    if (Array.isArray(state.refillData)) {
                        state.refillData.forEach((item: any) => this.addProductToForm(item));
                    } else {
                        this.addProductToForm(state.refillData);
                    }
                    this.cdr.detectChanges();
                } else if (state?.refillItems) {
                    this.isReorder = true;
                    state.refillItems.forEach((item: any) => this.addProductToForm(item));
                    this.cdr.detectChanges();
                } else {
                    this.addRow();
                }
            }, 500);
        }
    }

    loadWarehouses() {
        this.locationService.getWarehouses().subscribe((res: any) => {
            this.warehouses = res;
        });
    }

    loadUnits() {
        this.unitService.getAll().subscribe((res: any) => {
            this.allUnits = res;
        });
    }

    private initForm() {
        this.poForm = this.fb.group({
            supplierId: [null, Validators.required],
            priceListId: [null, Validators.required],
            poDate: [new Date(), Validators.required],
            expectedDeliveryDate: [new Date(), Validators.required],
            PoNumber: [{ value: '', disabled: true }],
            remarks: ['', Validators.required],
            items: this.fb.array([], Validators.required),
            isTaxApplicable: [true],
            taxType: ['local'],
            tdsPercent: [0],
            tcsPercent: [0]
        });

        this.poForm.get('isTaxApplicable')?.valueChanges.subscribe(val => {
            this.selectedSupplierIsUnregistered = !val;
            this.items.controls.forEach((ctrl, idx) => {
                if (!val) {
                    ctrl.get('gstPercent')?.setValue(0, { emitEvent: false });
                } else {
                    const original = ctrl.get('originalGst')?.value || 0;
                    ctrl.get('gstPercent')?.setValue(original, { emitEvent: false });
                }
                this.updateTotal(idx);
            });
        });
    }

    loadPODetails(id: any) {
        this.isLoading = true;
        this.poService.getById(id).subscribe({
            next: (res: any) => {
                this.currentStatus = res.status;
                this.poForm.patchValue({
                    supplierId: res.supplierId,
                    priceListId: res.priceListId,
                    PoNumber: res.poNumber,
                    poDate: DateHelper.toDateObject(res.poDate),
                    expectedDeliveryDate: DateHelper.toDateObject(res.expectedDeliveryDate),
                    remarks: res.remarks || ''
                });
                this.items.clear();
                if (res.items) {
                    res.items.forEach((item: any) => this.addEditRow(item));
                }
                this.isLoading = false;
                this.onSupplierChange(res.supplierId);
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
                this.notification.showStatus(false, 'Failed to load order details');
            }
        });
    }

    addEditRow(item: any): void {
        const isExpReq = item.isExpiryRequired || item.IsExpiryRequired || false;
        const index = this.items.length;
        const row = this.fb.group({
            productSearch: [item.productName, Validators.required],
            productId: [item.productId, Validators.required],
            sku: [item.sku || ''],
            currentStock: [item.currentStock || 0],
            warehouseName: [item.warehouseName || 'Main WH'],
            warehouseId: [item.warehouseId || null],
            rackName: [item.rackName || 'NA'],
            rackId: [item.rackId || null],
            qty: [item.qty, [Validators.required, Validators.min(0.01)]],
            unit: [item.unit || 'PCS', Validators.required],
            price: [item.rate || item.price || 0, [Validators.required, Validators.min(0)]],
            discountPercent: [item.discountPercent || 0],
            gstPercent: [item.gstPercent || 0],
            taxAmount: [{ value: item.taxAmount || 0, disabled: true }],
            total: [{ value: item.total, disabled: true }],
            id: [item.id || 0],
            originalGst: [item.gstPercent || 0],
            mfgDate: [item.manufacturingDate || item.mfgDate ? DateHelper.toDateObject(item.manufacturingDate || item.mfgDate) : null, isExpReq ? Validators.required : []],
            expDate: [item.expiryDate || item.expDate ? DateHelper.toDateObject(item.expiryDate || item.expDate) : null, isExpReq ? Validators.required : []],
            isExpiryRequired: [isExpReq]
        });
        
        this.items.push(row);
        this.setupFilter(index);
        this.updateTotal(index);

        if (row.get('warehouseId')?.value) {
            this.locationService.getRacksByWarehouse(row.get('warehouseId')?.value).subscribe(racks => {
                this.racksByItem[index] = racks;
            });
        }
    }

    openBulkAddDialog() {
        const dialogRef = this.dialog.open(ProductSelectionDialogComponent, {
            width: '1250px',
            maxWidth: '96vw',
            data: { 
                mode: 'purchase',
                allowOutOfStock: true,
                existingIds: this.items.controls.map(c => c.get('productId')?.value) 
            }
        });

        dialogRef.afterClosed().subscribe((selectedProducts: any[]) => {
            if (selectedProducts && selectedProducts.length > 0) {
                // If first row is empty, remove it
                if (this.items.length === 1 && !this.items.at(0).get('productId')?.value) {
                    this.items.removeAt(0);
                }
                selectedProducts.forEach(product => {
                    const currentItems = this.items.value || [];
                    const isDuplicate = currentItems.some((item: any) => item.productId === (product.id || product.productId));
                    
                    if (!isDuplicate) {
                        this.addProductToForm(product);
                    }
                });
            }
        });
    }

    addProductToForm(product: any) {
        const productId = product.id || product.productId;
        const index = this.items.length;
        const itemForm = this.fb.group({
            productSearch: [product.productName || product.name, Validators.required],
            productId: [productId, Validators.required],
            sku: [product.sku || ''],
            currentStock: [product.currentStock || product.availableStock || 0],
            warehouseName: [product.defaultWarehouseName || product.warehouseName || 'Main WH'],
            warehouseId: [product.defaultWarehouseId || product.warehouseId || null],
            rackName: [product.defaultRackName || product.rackName || 'NA'],
            rackId: [product.defaultRackId || product.rackId || null],
            qty: [product.suggestedQty || 1, [Validators.required, Validators.min(0.01)]],
            unit: [product.unit || 'PCS', Validators.required],
            price: [product.basePurchasePrice || product.purchasePrice || product.basePrice || product.rate || product.price || 0, [Validators.required, Validators.min(0)]],
            discountPercent: [0],
            gstPercent: [this.selectedSupplierIsUnregistered ? 0 : (product.gstPercent ?? product.defaultGst ?? 18)],
            originalGst: [product.gstPercent ?? product.defaultGst ?? 18],
            taxAmount: [{ value: 0, disabled: true }],
            total: [{ value: 0, disabled: true }],
            mfgDate: [null, product.isExpiryRequired ? Validators.required : []],
            expDate: [null, product.isExpiryRequired ? Validators.required : []],
            isExpiryRequired: [product.isExpiryRequired || false],
            id: [0]
        });

        this.items.push(itemForm);
        this.setupFilter(index);
        this.updateTotal(index);
        this.cdr.detectChanges();

        if (productId && productId !== '00000000-0000-0000-0000-000000000000') {
            const priceListId = this.poForm.get('priceListId')?.value;
            if (priceListId && priceListId !== '00000000-0000-0000-0000-000000000000') {
                this.inventoryService.getProductRate(productId, priceListId).subscribe({
                    next: (res: any) => {
                        if (res) {
                            itemForm.patchValue({
                                price: res.recommendedRate || res.rate,
                                discountPercent: res.discount || res.discountPercent || 0,
                                gstPercent: this.selectedSupplierIsUnregistered ? 0 : (res.gstPercent ?? 18),
                            });
                            this.updateTotal(index);
                            this.cdr.detectChanges();
                        }
                    }
                });
            }
        }
    }

    get items(): FormArray {
        return (this.poForm?.get('items') as FormArray) || this.fb.array([]);
    }

    addRow() {
        const index = this.items.length;
        const row = this.fb.group({
            productSearch: ['', Validators.required],
            productId: [null, Validators.required],
            sku: [''],
            currentStock: [0],
            warehouseName: [''],
            warehouseId: [null],
            rackName: [''],
            rackId: [null],
            qty: [1, [Validators.required, Validators.min(0.01)]],
            unit: ['PCS', Validators.required],
            price: [0, [Validators.required, Validators.min(0)]],
            discountPercent: [0],
            gstPercent: [this.selectedSupplierIsUnregistered ? 0 : 18],
            originalGst: [18],
            taxAmount: [{ value: 0, disabled: true }],
            total: [{ value: 0, disabled: true }],
            mfgDate: [null],
            expDate: [null],
            isExpiryRequired: [false],
            id: [0]
        });

        this.items.push(row);
        this.setupFilter(index);
    }

    private setupFilter(index: number): void {
        const row = this.items.at(index);
        this.filteredProducts[index] = row.get('productSearch')!.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(value => {
                const str = typeof value === 'string' ? value : value?.productName || value?.name;
                if (!str || str.length < 2) return of([]);
                this.isProductLoading[index] = true;
                return this.productService.searchProducts(str).pipe(
                    finalize(() => this.isProductLoading[index] = false),
                    catchError(() => of([]))
                );
            }),
            takeUntil(this.destroy$)
        );

        this.filteredUnits[index] = row.get('unit')!.valueChanges.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            switchMap(value => {
                const str = (value || '').toLowerCase();
                return of(this.allUnits.filter(u => (u.unitName || u.name || '').toLowerCase().includes(str)));
            }),
            takeUntil(this.destroy$)
        );
    }

    displayProductFn(p: any): string {
        if (!p) return '';
        return p.productName || p.name || (typeof p === 'string' ? p : '');
    }

    onProductChange(index: number, event: any): void {
        const product = event.option.value;
        const row = this.items.at(index);
        const priceListId = this.poForm.get('priceListId')?.value;

        if (!product) return;

        const isDuplicate = this.items.controls.some((ctrl, i) => i !== index && ctrl.get('productId')?.value === (product.id || product.productId));
        if (isDuplicate) {
            this.notification.showStatus(false, 'Product already added.');
            row.patchValue({ productId: null, productSearch: '' });
            return;
        }

        const isTaxOff = !this.poForm.get('isTaxApplicable')?.value;
        
        row.patchValue({
            productId: product.id || product.productId,
            productSearch: product,
            unit: product.unit || 'PCS',
            price: product.basePurchasePrice || product.purchasePrice || product.basePrice || product.rate || product.price || 0,
            gstPercent: isTaxOff ? 0 : (product.defaultGst ?? product.gstPercent ?? 18),
            originalGst: product.defaultGst ?? product.gstPercent ?? 18,
            discountPercent: 0,
            qty: 1,
            currentStock: product.currentStock || 0,
            sku: product.sku || '',
            warehouseId: product.warehouseId || product.defaultWarehouseId || null,
            warehouseName: product.defaultWarehouseName || product.warehouseName || 'Main WH',
            rackId: product.rackId || product.defaultRackId || null,
            rackName: product.defaultRackName || product.rackName || 'Rack-1',
            isExpiryRequired: product.isExpiryRequired ?? false,
            mfgDate: null,
            expDate: null
        });

        if (product.isExpiryRequired) {
            row.get('mfgDate')?.setValidators(Validators.required);
            row.get('expDate')?.setValidators(Validators.required);
        } else {
            row.get('mfgDate')?.clearValidators();
            row.get('expDate')?.clearValidators();
        }
        row.get('mfgDate')?.updateValueAndValidity();
        row.get('expDate')?.updateValueAndValidity();

        if ((product.id || product.productId) && priceListId) {
            this.inventoryService.getProductRate(product.id || product.productId, priceListId).subscribe({
                next: (res: any) => {
                    if (res) {
                        row.patchValue({
                            price: res.recommendedRate || res.rate,
                            discountPercent: res.discount || res.discountPercent || 0,
                            gstPercent: isTaxOff ? 0 : (res.GstPercent || res.gstPercent || row.get('gstPercent')?.value || 18)
                        });
                    }
                    this.updateTotal(index);
                },
                error: () => this.updateTotal(index)
            });
        } else {
            this.updateTotal(index);
        }
    }

    removeItem(index: number) {
        this.items.removeAt(index);
        this.racksByItem.splice(index, 1);
        this.filteredUnits.splice(index, 1);
        this.filteredProducts.splice(index, 1);
        this.isProductLoading.splice(index, 1);
    }

    updateTotal(index: number): void {
        const row = this.items.at(index);
        if (!row) return;
        const qty = Number(row.get('qty')?.value || 0);
        const price = Number(row.get('price')?.value || 0);
        const discPercent = Number(row.get('discountPercent')?.value || 0);
        const gstPercent = Number(row.get('gstPercent')?.value || 0);

        const amount = qty * price;
        const discountAmount = (amount * discPercent) / 100;
        const taxableAmount = amount - discountAmount;
        const isTaxApplicable = this.poForm.get('isTaxApplicable')?.value ?? true;
        const taxAmt = isTaxApplicable ? (taxableAmount * gstPercent) / 100 : 0;
        const rowTotal = taxableAmount + taxAmt;

        row.patchValue({ taxAmount: taxAmt.toFixed(2), total: rowTotal.toFixed(2) }, { emitEvent: false });
    }

    get grandTotal(): number {
        return this.items.controls.reduce((sum, ctrl) => sum + (parseFloat(ctrl.get('total')?.value) || 0), 0);
    }

    get totalQty(): number {
        return this.items.controls.reduce((sum, ctrl) => sum + (Number(ctrl.get('qty')?.value) || 0), 0);
    }

    get subTotal(): number {
        return this.items.controls.reduce((sum, ctrl) => {
            const qty = Number(ctrl.get('qty')?.value) || 0;
            const price = Number(ctrl.get('price')?.value || 0);
            const disc = Number(ctrl.get('discountPercent')?.value) || 0;
            return sum + (qty * price * (1 - disc / 100));
        }, 0);
    }

    get totalTaxAmount(): number {
        return this.items.controls.reduce((sum, ctrl) => sum + (parseFloat(ctrl.get('taxAmount')?.value) || 0), 0);
    }

    get tdsAmount(): number {
        return (this.subTotal * (this.poForm.get('tdsPercent')?.value || 0)) / 100;
    }

    get tcsAmount(): number {
        return (this.subTotal * (this.poForm.get('tcsPercent')?.value || 0)) / 100;
    }

    get finalGrandTotal(): number {
        return this.grandTotal - this.tdsAmount + this.tcsAmount;
    }

    loadNextPoNumber() {
        this.inventoryService.getNextPoNumber(this.authService.getBranchId()).subscribe((res: any) => {
            this.poForm.patchValue({ PoNumber: res.poNumber });
        });
    }

    bindDropdownPriceList() {
        this.isLoadingPriceLists = true;
        this.inventoryService.getPriceListsForDropdown().subscribe({
            next: (data: any) => {
                this.priceLists = data || [];
                this.isLoadingPriceLists = false;
            },
            error: () => this.isLoadingPriceLists = false
        });
    }

    onSupplierChange(supplierId: string): void {
        if (!supplierId) return;
        this.supplierService.getSupplierById(supplierId).subscribe((res: any) => {
            const pListId = res.defaultpricelistId || res.defaultPriceListId || res.priceListId;
            this.selectedSupplierIsUnregistered = !res.gstIn || res.gstIn === '' || res.gstIn.toUpperCase() === 'PENDING';
            this.poForm.get('isTaxApplicable')?.setValue(!this.selectedSupplierIsUnregistered, { emitEvent: true });
            if (pListId) {
                this.poForm.get('priceListId')?.setValue(pListId);
                this.isPriceListAutoSelected = true;
                this.refreshAllItemRates(pListId);
            } else {
                this.isPriceListAutoSelected = false;
            }
        });
    }

    refreshAllItemRates(priceListId: string) {
        this.items.controls.forEach((control, index) => {
            const prodId = control.get('productId')?.value;
            if (prodId && priceListId) {
                this.inventoryService.getProductRate(prodId, priceListId).subscribe({
                    next: (res: any) => {
                        if (res) {
                            control.patchValue({
                                price: res.recommendedRate || res.rate,
                                discountPercent: res.discount || res.discountPercent || 0,
                                gstPercent: this.selectedSupplierIsUnregistered ? 0 : (res.gstPercent ?? 18),
                            });
                        }
                        this.updateTotal(index);
                    }
                });
            }
        });
    }

    loadSuppliers(selectId?: string) {
        this.isLoadingSuppliers = true;
        this.supplierService.getSuppliers().pipe(finalize(() => this.isLoadingSuppliers = false)).subscribe({
            next: (res: any) => {
                this.suppliers = res;
                if (selectId) {
                    this.poForm.get('supplierId')?.setValue(selectId);
                    this.onSupplierChange(selectId);
                }
            }
        });
    }

    openSupplierModal() {
        const dialogRef = this.dialog.open(SupplierModalComponent, {
            width: '600px',
            disableClose: true
        });
        dialogRef.afterClosed().subscribe((res: any) => {
            if (res) {
                const newId = (typeof res === 'object') ? res.id : undefined;
                this.loadSuppliers(newId);
                this.notification.showStatus(true, 'New supplier added successfully!');
            }
        });
    }

    getMinExpDate(mfgDateValue: any): Date {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!mfgDateValue) return today;
        const mfgDate = new Date(mfgDateValue);
        mfgDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(mfgDate);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay > today ? nextDay : today;
    }

    openLocationTracker(row: any) {
        const dialogRef = this.dialog.open(LocationTrackerDialogComponent, {
          width: '500px',
          data: { 
            productId: row.get('productId').value,
            productName: row.get('productSearch').value?.productName || row.get('productSearch').value
          }
        });
    
        dialogRef.afterClosed().subscribe(res => {
          if (res) {
            row.patchValue({
              warehouseId: res.warehouseId,
              warehouseName: res.warehouseName,
              rackId: res.rackId,
              rackName: res.rackName,
              currentStock: res.stock
            });
          }
        });
    }

    saveDraft() {
        if (!this.permissionService.hasPermission(this.isEditMode ? 'CanEdit' : 'CanAdd')) {
            this.notification.showStatus(false, 'You do not have permission to perform this action.');
            return;
        }
        if (this.poForm.invalid) {
            this.poForm.markAllAsTouched();
            this.notification.showStatus(false, 'Please fill all required fields correctly.');
            return;
        }
        this.loadingService.setLoading(true, this.isEditMode ? 'Updating Purchase Order...' : 'Saving Purchase Order...');
        const formValue = this.poForm.getRawValue();
        const payload = {
            id: this.isEditMode ? this.poId : '00000000-0000-0000-0000-000000000000',
            supplierId: formValue.supplierId,
            supplierName: this.suppliers.find(s => s.id === formValue.supplierId)?.name || '',
            priceListId: formValue.priceListId,
            poDate: DateHelper.toLocalISOString(formValue.poDate) || '',
            expectedDeliveryDate: DateHelper.toLocalISOString(formValue.expectedDeliveryDate) || '',
            poNumber: formValue.PoNumber,
            remarks: formValue.remarks || '',
            taxType: formValue.taxType || 'local',
            tdsPercent: Number(formValue.tdsPercent || 0),
            tcsPercent: Number(formValue.tcsPercent || 0),
            tdsAmount: this.tdsAmount,
            tcsAmount: this.tcsAmount,
            igstAmount: formValue.taxType === 'interState' ? this.totalTaxAmount : 0,
            cgstAmount: formValue.taxType === 'local' ? this.totalTaxAmount / 2 : 0,
            sgstAmount: formValue.taxType === 'local' ? this.totalTaxAmount / 2 : 0,
            grandTotal: this.finalGrandTotal,
            subTotal: this.subTotal,
            totalTax: this.totalTaxAmount,
            totalQuantity: this.totalQty,
            status: 'Draft',
            isQuick: true,
            createdBy: this.authService.getUserEmail(),
            companyId: this.authService.getCompanyId(),
            branchId: this.authService.getBranchId(),
            items: this.items.getRawValue().map((i: any) => ({
                id: i.id || 0,
                productId: i.productId,
                qty: Number(i.qty),
                unit: i.unit || 'PCS',
                rate: Number(i.price), // Payload expects 'rate'
                discountPercent: Number(i.discountPercent),
                gstPercent: Number(i.gstPercent),
                taxAmount: Number(i.taxAmount || 0),
                total: Number(i.total),
                warehouseId: i.warehouseId || null,
                rackId: i.rackId || null,
                manufacturingDate: i.mfgDate ? DateHelper.toLocalISOString(i.mfgDate) : null,
                expiryDate: i.expDate ? DateHelper.toLocalISOString(i.expDate) : null,
                branchId: this.authService.getBranchId()
            }))
        };

        const request$ = this.isEditMode ? this.poService.update(this.poId, payload) : this.inventoryService.savePoDraft(payload);
        request$.subscribe({
            next: (res: any) => {
                this.isSaving = false;
                this.loadingService.setLoading(false);
                this.notification.showStatus(true, `Quick Purchase Draft ${this.isEditMode ? 'Updated' : 'Saved'}!`);
                this.router.navigate(['/app/quick-inventory/purchase/list']);
            },
            error: (err: any) => {
                this.isSaving = false;
                this.loadingService.setLoading(false);
                this.notification.showStatus(false, err.error?.message || 'Failed to save draft.');
            }
        });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.scrollContainer = document.querySelector('.content');
            if (this.scrollContainer) {
                this.scrollListener = this.onScroll.bind(this);
                this.scrollContainer.addEventListener('scroll', this.scrollListener);
            }
        }, 500);
    }

    ngOnDestroy() {
        if (this.scrollContainer && this.scrollListener) {
            this.scrollContainer.removeEventListener('scroll', this.scrollListener);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initBarcodeListener() {
        this.barcodeHelper.onScan().pipe(takeUntil(this.destroy$)).subscribe((code: any) => {
            this.isScanning = true;
            this.lastScannedCode = code;
            this.handleBarcodeScan(code);
            setTimeout(() => {
                this.isScanning = false;
                this.cdr.detectChanges();
            }, 1500);
        });
    }

    private handleBarcodeScan(sku: string) {
        const existingIndex = this.items.controls.findIndex(ctrl => ctrl.get('sku')?.value === sku);
        if (existingIndex > -1) {
            const qtyCtrl = this.items.at(existingIndex).get('qty');
            qtyCtrl?.setValue(Number(qtyCtrl.value) + 1);
            this.updateTotal(existingIndex);
            this.notification.showStatus(true, `Quantity updated for SKU: ${sku}`);
            return;
        }
        this.isLoading = true;
        this.productService.searchProducts(sku).pipe(finalize(() => this.isLoading = false)).subscribe((products: any) => {
            const match = products.find((p: any) => p.sku === sku);
            if (match) {
                // If first row is empty, remove it
                if (this.items.length === 1 && !this.items.at(0).get('productId')?.value) {
                    this.items.removeAt(0);
                }
                this.addProductToForm(match);
                this.notification.showStatus(true, `Product added: ${match.productName}`);
            } else {
                const dialogRef = this.dialog.open(ProductForm, {
                    width: '850px',
                    disableClose: true,
                    data: { sku: sku }
                });

                dialogRef.afterClosed().subscribe((newProduct: any) => {
                    if (newProduct) {
                        if (this.items.length === 1 && !this.items.at(0).get('productId')?.value) {
                            this.items.removeAt(0);
                        }
                        this.addProductToForm(newProduct);
                        this.notification.showStatus(true, `New product created and added: ${newProduct.productName}`);
                    }
                });
            }
        });
    }
}
