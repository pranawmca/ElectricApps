import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../service/inventory.service';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { MatDialog } from '@angular/material/dialog';
import { GrnSuccessDialogComponent } from '../grn-success-dialog/grn-success-dialog.component';
import { FinanceService } from '../../finance/service/finance.service';
import { LocationService } from '../../master/locations/services/locations.service';
import { Warehouse, Rack } from '../../master/locations/models/locations.model';
import { LoadingService } from '../../../core/services/loading.service';
import { DateHelper } from '../../../shared/models/date-helper';
import { GrnPrintDialogComponent } from '../grn-print-dialog/grn-print-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-grn-form-component',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule],
  templateUrl: './grn-form-component.html',
  styleUrl: './grn-form-component.scss',
})
export class GrnFormComponent implements OnInit, OnDestroy {
  grnForm!: FormGroup;
  items: any[] = [];
  poId: string = '';
  supplierId: string | null = null;
  supplierName: string = '';
  isFromPopup: boolean = false;
  isViewMode: boolean = false;
  private dialog = inject(MatDialog);
  private financeService = inject(FinanceService);
  private locationService = inject(LocationService);
  private loadingService = inject(LoadingService);
  private authService = inject(AuthService);

  warehouses: Warehouse[] = [];
  private allWarehouses: Warehouse[] = [];
  racks: Rack[] = [];
  private allRacks: Rack[] = [];
  filteredRacksMap: { [productId: string]: Rack[] } = {};
  private branchSubscription: Subscription | null = null;

  // Auto-save countdown (active only in gate pass flow)
  countdown: number = 30;
  private countdownInterval: any = null;
  showCountdown: boolean = false;
  isQuick: boolean = false;
  isSaving: boolean = false; // Guard against duplicate submissions
  isSaveButtonDisabled: boolean = false; // FINAL FLAG for button
  private grnSavedKey: string = ''; // sessionStorage key for this PO

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private inventoryService: InventoryService
  ) {
    // Initialize form here IMMEDIATELY to prevent validator errors in template
    this.grnForm = this.fb.group({
      grnNumber: [{ value: 'AUTO-GEN', disabled: true }],
      receivedDate: [new Date(), Validators.required],
      supplierName: [{ value: '', disabled: true }],
      poNumber: [{ value: '', disabled: true }],
      gatePassNo: [{ value: '', disabled: true }],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    this.isViewMode = this.router.url.includes('/view');

    // Read isQuick flag from route data (check current route + parent routes)
    let currentRoute = this.route;
    while (currentRoute) {
      if (currentRoute.snapshot.data['isQuick'] === true) {
        this.isQuick = true;
        break;
      }
      currentRoute = currentRoute.parent as any;
    }
    console.log('📍 GRN Form Init - isQuick:', this.isQuick, 'URL:', this.router.url);

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.resetFormBeforeLoad();
        this.poId = params['id'].toString();
        if (this.isViewMode) {
          this.loadPOData('00000000-0000-0000-0000-000000000000', this.poId);
        } else {
          this.loadPOData(this.poId);
        }
      }
    });

    this.loadLocations();

    this.route.queryParams.subscribe(params => {
      if (params['poId']) {
        const poId = params['poId'].toString();
        this.grnSavedKey = `grn_saved_${poId}`;

        // ⛔ If GRN was already saved for this PO in this session, redirect back
        if (sessionStorage.getItem(this.grnSavedKey)) {
          console.warn('⛔ GRN already saved for poId', poId, '- redirecting to list.');
          this.navigateBack();
          return;
        }

        this.resetFormBeforeLoad();
        this.poId = poId;
        this.isFromPopup = true;
        // Check query params as fallback (for backward compatibility)
        if (params['isQuick']) {
          const isQuickParam = params['isQuick'] === 'true' || params['isQuick'] === true;
          console.log('📍 Query param isQuick:', isQuickParam);
          this.isQuick = this.isQuick || isQuickParam; // Merge with route data
        }

        if (params['poNo']) {
          this.grnForm.patchValue({ poNumber: params['poNo'] });
        }
        if (params['gatePassNo']) {
          this.grnForm.patchValue({ gatePassNo: params['gatePassNo'] });
          this.gatePassNo = params['gatePassNo'];
        }
        if (params['qty']) {
          this.gatePassQty = Number(params['qty']);
        }
        this.loadPOData(this.poId, null, this.gatePassNo);
      }
    });
  }

  gatePassQty: number | null = null;
  gatePassNo: string | null = null;

  private resetFormBeforeLoad() {
    this.items = [];
    if (this.grnForm) {
      this.grnForm.patchValue({ supplierName: '', poNumber: '' });
    }
  }

  initForm() {
    this.grnForm = this.fb.group({
      grnNumber: [{ value: 'AUTO-GEN', disabled: true }],
      receivedDate: [new Date(), Validators.required],
      supplierName: [{ value: '', disabled: true }],
      poNumber: [{ value: '', disabled: true }],
      gatePassNo: [{ value: '', disabled: true }],
      remarks: ['']
    });
  }

  loadLocations() {
    this.locationService.getWarehouses().subscribe(data => {
      this.allWarehouses = data.filter(w => w.isActive);
      this.applyBranchFilter();
    });
    this.locationService.getRacks().subscribe(data => {
      this.allRacks = data.filter(r => r.isActive);
      this.racks = this.allRacks;
    });

    // Subscribe to branch changes from toolbar
    this.branchSubscription = this.authService.branchId$.subscribe(branchId => {
      console.log('🔄 GRN Form - Branch Changed:', branchId);
      this.applyBranchFilter(branchId);
    });
  }

  private applyBranchFilter(branchId: string | null = null) {
    const activeBranchId = branchId || this.authService.getWorkingBranchId();
    console.log('🎯 Applying Branch Filter to Warehouses. ActiveBranchId:', activeBranchId);

    if (activeBranchId && activeBranchId !== 'all') {
      this.warehouses = this.allWarehouses.filter(w => 
        String(w.branchId) === String(activeBranchId)
      );
    } else {
      this.warehouses = this.allWarehouses;
    }

    // After filtering warehouses, we should check if currently selected warehouseId in items is still valid
    if (this.items && this.items.length > 0) {
      this.items.forEach(item => {
        if (item.warehouseId && !this.warehouses.some(w => w.id === item.warehouseId)) {
          item.warehouseId = null;
          item.rackId = null;
        }
      });
    }

    this.cdr.detectChanges();
  }

  onWarehouseChange(item: any) {
    this.filteredRacksMap[item.productId] = this.racks.filter(r => r.warehouseId === item.warehouseId);
    // Reset rack if it's not in the new filtered list
    if (item.rackId && !this.filteredRacksMap[item.productId].some(r => r.id === item.rackId)) {
      item.rackId = null;
    }
  }

  loadPOData(id: string, grnHeaderId: string | null = null, gatePassNo: string | null = null) {
    this.inventoryService.getPODataForGRN(id, grnHeaderId, gatePassNo).subscribe({
      next: (res) => {
        if (!res) return;
        console.log('pendingqtycheck:', res);

        // Capture supplier details for payment navigation
        this.supplierId = res.supplierId || res.SupplierId || null;
        this.supplierName = res.supplierName || res.SupplierName || '';

        console.log('✅ PO Data Loaded. Supplier Info:', {
          id: this.supplierId,
          name: this.supplierName,
          originalRes: res
        });

        this.grnForm.patchValue({
          grnNumber: res.grnNumber || 'AUTO-GEN',
          poNumber: res.poNumber,
          supplierName: this.supplierName,
          remarks: res.remarks || ''
        });

        if (res.items && res.items.length > 0) {
          this.mapItems(res.items);
        }
        this.forceLockTable();
      }
    });
  }

  forceLockTable() {
    if (this.isViewMode) {
      this.grnForm.disable();
      this.cdr.detectChanges();
    }
  }

  mapItems(incomingItems: any[]) {
    console.log('🔄 Mapping GRN Items. isQuick:', this.isQuick, 'GatePassQty:', this.gatePassQty);
    
    const mappedItems = incomingItems.map((item: any) => {
      const ordered = Number(item.orderedQty || item.OrderedQty || 0);
      const grossReceived = Number(item.receivedQty || item.ReceivedQty || 0);
      const rejectedSoFar = Number(item.rejectedQty || item.RejectedQty || 0);
      // Net accepted = gross received - rejected (items actually in stock)
      const acceptedSoFar = Number(item.acceptedQty || item.AcceptedQty || 0) || Math.max(0, grossReceived - rejectedSoFar);

      // Pending = items still needed (ordered - net accepted). Trust backend if provided.
      let pending = (item.pendingQty !== undefined && item.pendingQty !== null) 
                    ? Number(item.pendingQty) 
                    : ((item.PendingQty !== undefined && item.PendingQty !== null) 
                       ? Number(item.PendingQty) 
                       : Math.max(0, ordered - acceptedSoFar));

      const rate = Number(item.unitRate || item.unitPrice || item.UnitPrice || 0);
      
      // 🎯 Fix: Stronger pre-filling logic for data binding (isQuick flow)
      let received = 0;
      if (this.isViewMode) {
        received = Number(item.receivedQty || item.ReceivedQty || 0);
      } else if (this.isQuick) {
        // 🎯 FIX: Trust the backend's proposed quantity (handles replacements correctly)
        // If the backend didn't specify a quantity, fall back to the full pending quantity.
        const backendQty = (item.receivedQty !== undefined && item.receivedQty !== null) ? item.receivedQty : item.ReceivedQty;
        received = (backendQty !== undefined && backendQty !== null) ? Number(backendQty) : pending;
      } else if (this.gatePassQty && this.gatePassQty > 0) {
        received = Math.min(this.gatePassQty, pending);
      } else {
        received = Number(item.receivedQty || 0);
      }

      const rejected = 0;
      const accepted = received - rejected;
      const discPer = Number(item.discountPercent || item.DiscountPercent || 0);
      const gstPer = Number(item.gstPercent || item.GstPercent || 0);

      const baseAmt = accepted * rate;
      const discAmt = baseAmt * (discPer / 100);
      const taxableAmt = baseAmt - discAmt;
      const taxAmt = taxableAmt * (gstPer / 100);

      return {
        ...item,
        productId: item.productId || item.ProductId,
        productName: item.productName || item.ProductName,
        poNumber: item.poNumber || item.PoNumber || this.grnForm.get('poNumber')?.value,
        orderedQty: ordered,
        pendingQty: pending,
        receivedQty: received,
        isReplacement: !!(item.isReplacement || item.IsReplacement),
        rejectedQty: rejected,
        acceptedQty: accepted,
        unitRate: rate,
        supplierId: item.supplierId || item.SupplierId || this.supplierId || null,
        supplierName: item.supplierName || item.SupplierName || this.supplierName || '',
        discountPercent: discPer,
        gstPercent: gstPer,
        taxAmount: taxAmt,
        total: !!(item.isReplacement || item.IsReplacement) ? 0 : (taxableAmt + taxAmt),
        warehouseId: item.warehouseId || item.WarehouseId || null,
        rackId: item.rackId || item.RackId || null,
        isExpiryRequired: !!(item.isExpiryRequired || item.IsExpiryRequired),
        manufacturingDate: DateHelper.toShortDisplayDate(
          item.manufacturingDate || item.ManufacturingDate || item.mfgDate || item.MfgDate
        ),
        expiryDate: DateHelper.toShortDisplayDate(
          item.expiryDate || item.ExpiryDate || item.expDate || item.ExpDate
        )
      };
    });

    // 🎯 Use immutable update to trigger Change Detection
    this.items = [...mappedItems];

    this.items.forEach(item => {
      if (item.warehouseId) {
        this.onWarehouseChange(item);
      }
    });

    // Final UI Sync
    setTimeout(() => {
      this.calculateGrandTotal();
      this.validateFormState(); // Capture initial invalid states
      this.cdr.detectChanges();
    }, 150);

    // Start auto-save countdown only for REAL gate pass flow (isFromPopup AND NOT isQuick)
    if (this.isFromPopup && !this.isViewMode && !this.isQuick) {
      this.startAutoSaveCountdown();
    }
  }

  private startAutoSaveCountdown() {
    this.countdown = 30;
    this.showCountdown = true;
    this.cdr.detectChanges();

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();

      if (this.countdown <= 0) {
        this.clearCountdown();
        this.performGRNSave(); // Auto-save on timeout
      }
    }, 1000);
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.showCountdown = false;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.clearCountdown();
    if (this.branchSubscription) {
      this.branchSubscription.unsubscribe();
    }
  }

  onQtyChange(item: any) {
    if (this.isViewMode) return;

    const rawValue = item.receivedQty;
    const isActuallyEmpty = rawValue === null || rawValue === undefined || String(rawValue).trim() === '';
    
    const enteredQty = isActuallyEmpty ? 0 : Number(rawValue);
    const rejectedQty = Number(item.rejectedQty || 0);
    const unitRate = Number(item.unitRate || 0);

    // Recalculate derived values based on current input (even if potentially invalid)
    item.acceptedQty = Math.max(0, enteredQty - rejectedQty);

    const discPer = Number(item.discountPercent || 0);
    const gstPer = Number(item.gstPercent || 0);

    const baseAmt = item.acceptedQty * unitRate;
    const discAmt = baseAmt * (discPer / 100);
    const taxableAmt = baseAmt - discAmt;
    const taxAmt = taxableAmt * (gstPer / 100);

    item.taxAmount = taxAmt;
    
    // 🛡️ REPLACEMENT LOGIC: Replacement items should not add to the financial total
    if (item.isReplacement) {
      item.total = 0;
    } else {
      item.total = taxableAmt + taxAmt;
    }

    this.calculateGrandTotal();
    this.cdr.detectChanges(); 
  }

  onQtyBlur(item: any) {
    if (this.isViewMode) return;

    const rawValue = item.receivedQty;
    const isActuallyEmpty = rawValue === null || rawValue === undefined || String(rawValue).trim() === '';
    const enteredQty = isActuallyEmpty ? 0 : Number(rawValue);
    const pendingQty = Number(item.pendingQty || 0);
    const rejectedQty = Number(item.rejectedQty || 0);

    // 1. Validation for Pending Qty
    if (enteredQty > pendingQty) {
      item.receivedQty = ''; // Clear as requested
      this.showValidationError(`Received quantity cannot exceed the pending quantity (${pendingQty}).`);
      this.onQtyChange(item); // Refresh totals after clearing
    } 
    // 2. Validation for Rejected Qty
    else if (rejectedQty > enteredQty) {
      item.rejectedQty = 0;
      this.showValidationError(`Rejected quantity cannot exceed the received quantity (${enteredQty}).`);
      this.onQtyChange(item); // Refresh totals after resetting rejection
    }
    // 3. General item validation (empty check, etc.)
    else {
      this.validateItem(item, true);
    }

    this.updateButtonState(); // Update button state after validation
  }

  get isButtonDisabled(): boolean {
    if (this.isViewMode || this.isSaving) return true;
    if (this.grnForm && this.grnForm.invalid) return true;
    if (!this.items || this.items.length === 0) return true;

    // Strict check for every item
    return this.items.some(item => {
      // 1. Recv Qty Check (Empty or <= 0 or > Pending)
      const rawRcvd = item.receivedQty;
      const rcvdStr = (rawRcvd === null || rawRcvd === undefined) ? '' : String(rawRcvd).trim();
      if (rcvdStr === '') return true; // Disabled if empty
      
      const rcvd = Number(rcvdStr);
      const pend = Number(item.pendingQty || 0);
      if (rcvd <= 0 || rcvd > pend) return true; // Disabled if 0 or > pending

      // 2. Rejected Qty Check (Empty or > Recv)
      const rawRej = item.rejectedQty;
      const rejStr = (rawRej === null || rawRej === undefined) ? '' : String(rawRej).trim();
      if (rejStr === '') return true; // Disabled if empty

      const rej = Number(rejStr);
      if (rej < 0 || rej > rcvd) return true; // Disabled if negative or > recv

      return false;
    });
  }

  updateButtonState() {
    if (this.isViewMode || this.isSaving) {
      this.isSaveButtonDisabled = true;
      return;
    }
    if (this.grnForm && this.grnForm.invalid) {
      this.isSaveButtonDisabled = true;
      return;
    }
    if (!this.items || this.items.length === 0) {
      this.isSaveButtonDisabled = true;
      return;
    }

    this.isSaveButtonDisabled = this.items.some(item => {
      const rcvd = Number(item.receivedQty || 0);
      const pend = Number(item.pendingQty || 0);
      const rej = Number(item.rejectedQty || 0);

      const isEmptyRcvd = item.receivedQty === null || item.receivedQty === undefined || String(item.receivedQty).trim() === '';
      const isEmptyRej = item.rejectedQty === null || item.rejectedQty === undefined || String(item.rejectedQty).trim() === '';

      if (isEmptyRcvd || rcvd <= 0 || rcvd > pend) return true;
      if (isEmptyRej || rej < 0 || rej > rcvd) return true;
      return false;
    });

    this.cdr.detectChanges();
  }

  private validateFormState() {
    this.updateButtonState();
  }

  private validateItem(item: any, showPopup: boolean): boolean {
    const rcvd = Number(item.receivedQty || 0);
    const pend = Number(item.pendingQty || 0);
    const rej = Number(item.rejectedQty || 0);

    // Case 1: Recv. Qty empty, zero or greater than pending
    if (item.receivedQty === null || item.receivedQty === undefined || item.receivedQty === '') {
      if (showPopup) this.showValidationError(`Received Quantity for "${item.productName}" cannot be empty.`);
      return false;
    }
    if (rcvd <= 0) {
      if (showPopup) this.showValidationError(`Received Quantity for "${item.productName}" must be greater than 0.`);
      return false;
    }
    if (rcvd > pend) {
      if (showPopup) this.showValidationError(`Received Quantity for "${item.productName}" cannot exceed Pending Quantity (${pend}).`);
      return false;
    }

    // Rejected Qty empty check
    if (item.rejectedQty === null || item.rejectedQty === undefined || item.rejectedQty === '') {
      if (showPopup) this.showValidationError(`Rejected Quantity for "${item.productName}" cannot be empty. Enter 0 if none.`);
      return false;
    }

    // Case 2: Rej. Qty greater than Recv. Qty
    if (rej > rcvd) {
      if (showPopup) this.showValidationError(`Rejected Quantity for "${item.productName}" cannot exceed Received Quantity (${rcvd}).`);
      return false;
    }

    return true;
  }

  showValidationError(message: string) {
    this.dialog.open(StatusDialogComponent, {
      width: '350px',
      data: { title: 'Validation Error', message: message, status: 'error', isSuccess: false }
    });
  }

  calculateGrandTotal(): number {
    return this.items.reduce((acc, item) => acc + (Number(item.total || 0)), 0);
  }

  saveGRN() {
    if (this.grnForm.invalid || this.items.length === 0 || this.isViewMode) return;
    if (this.isSaving) return; // ⛔ Prevent duplicate save

    // Detailed validation for all line items
    for (const item of this.items) {
      const rcvd = Number(item.receivedQty || 0);
      const pend = Number(item.pendingQty || 0);
      const rej = Number(item.rejectedQty || 0);

      if (rcvd <= 0) {
        this.showValidationError(`Please enter a valid Received Quantity for "${item.productName}". It must be greater than 0.`);
        return;
      }
      if (item.rejectedQty === null || item.rejectedQty === undefined || item.rejectedQty === '') {
        this.showValidationError(`Rejected Quantity for "${item.productName}" cannot be empty. Please enter 0 if there is no rejection.`);
        return;
      }
      if (rcvd > pend) {
        this.showValidationError(`Received Quantity for "${item.productName}" cannot exceed Pending Quantity (${pend}).`);
        return;
      }
      if (rej > rcvd) {
        this.showValidationError(`Rejected Quantity for "${item.productName}" cannot exceed Received Quantity (${rcvd}).`);
        return;
      }
    }

    this.clearCountdown(); // Cancel auto-save — user is saving manually

    const confirmDialog = this.dialog.open(StatusDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm GRN Save',
        message: `Are you sure you want to save this GRN and update stock?\n\nGrand Total: ₹${this.calculateGrandTotal().toFixed(2)}`,
        status: 'warning',
        isSuccess: false,
        showCancel: true
      }
    });

    confirmDialog.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.performGRNSave();
    });
  }

  performGRNSave() {
    if (this.isSaving) {
      console.warn('⛔ GRN Save already in progress. Ignoring duplicate call.');
      return;
    }

    // ⛔ Zero-qty guard: never save a ₹0 GRN from auto-countdown or refresh
    const totalQtyEntered = this.items.reduce((sum, i) => sum + Number(i.receivedQty || 0), 0);
    if (totalQtyEntered <= 0) {
      console.warn('⛔ performGRNSave blocked: all receivedQty are 0.');
      return;
    }

    this.isSaving = true;
    console.log('🚀 GRN Save Initiated - isQuick:', this.isQuick);
    
    const currentUserId = localStorage.getItem('email') || 'Admin';
    const formValue = this.grnForm.getRawValue();

    // Determine if this is a bulk operation based on items' PO IDs or the poId parameter
    const uniquePoIdsInGrid = [...new Set(this.items.map(i => i.poId || i.POId).filter(id => id))];
    const isMultiPO = uniquePoIdsInGrid.length > 1 || (this.poId && this.poId.includes(','));

    if (isMultiPO) {
      console.log('📦 Processing Bulk GRN Save for POs:', uniquePoIdsInGrid);
      const itemsByPo = new Map<string, any[]>();
      
      const paramIds = this.poId ? this.poId.split(',').map(id => id.trim()).filter(id => id) : [];
      const defaultPoId = paramIds.length > 0 ? paramIds[0] : (uniquePoIdsInGrid[0] || null);

      this.items.forEach(item => {
        const pId = item.poId || item.POId || defaultPoId;
        if (!itemsByPo.has(pId)) itemsByPo.set(pId, []);
        itemsByPo.get(pId)?.push(item);
      });

      this.loadingService.setLoading(true);
      const poIdsToProcess = Array.from(itemsByPo.keys());
      let index = 0;

      const processedGrns: { number: string, amount: number }[] = [];
      let totalSuccessAmount = 0;
      let uniqueSupplierId: any = null;
      let uniqueSupplierName = '';

      const saveNext = () => {
        if (index >= poIdsToProcess.length) {
          this.loadingService.setLoading(false);
          this.showBulkCompletionDialog(uniqueSupplierId, uniqueSupplierName, processedGrns, totalSuccessAmount);
          return;
        }

        const pId = poIdsToProcess[index];
        const poItems = itemsByPo.get(pId) || [];
        const firstItem = poItems[0];
        const poTotal = poItems.reduce((sum, i) => sum + Number(i.total || 0), 0);
        
        const sId = firstItem.supplierId || firstItem.SupplierId || this.supplierId || null;
        const sName = firstItem.supplierName || firstItem.SupplierName || this.supplierName || 'Multiple Suppliers';

        if (uniqueSupplierId === null) {
          uniqueSupplierId = sId;
          uniqueSupplierName = sName;
        } else if (uniqueSupplierId !== sId && uniqueSupplierId !== 'MULTI') {
          uniqueSupplierId = 'MULTI'; 
        }

        const grnData = {
          poHeaderId: pId,
          supplierId: sId,
          gatePassNo: formValue.gatePassNo,
          receivedDate: new Date(formValue.receivedDate).toISOString(),
          remarks: formValue.remarks,
          totalAmount: poTotal,
          status: 'Received',
          isQuick: this.isQuick,
          createdBy: currentUserId,
          companyId: this.authService.getCompanyId(),
          branchId: this.authService.getBranchId(),
          items: poItems.map(i => ({
            productId: i.productId,
            orderedQty: Number(i.orderedQty),
            receivedQty: Number(i.receivedQty),
            pendingQty: Number(i.pendingQty),
            rejectedQty: Number(i.rejectedQty),
            acceptedQty: Number(i.acceptedQty),
            unitRate: Number(i.unitRate),
            discountPercent: Number(i.discountPercent),
            gstPercent: Number(i.gstPercent),
            taxAmount: Number(i.taxAmount),
            totalAmount: Number(i.total),
            warehouseId: i.warehouseId,
            rackId: i.rackId,
            manufacturingDate: DateHelper.parseToISO(i.manufacturingDate),
            expiryDate: DateHelper.parseToISO(i.expiryDate)
          }))
        };

        this.inventoryService.saveGRN({ Data: grnData }).subscribe({
          next: (res: any) => {
            this.inventoryService.notifyInventoryChange();
            totalSuccessAmount += poTotal;
            if (res?.grnNumber) processedGrns.push({ number: res.grnNumber, amount: poTotal });
            index++;
            // Short delay to ensure backend sequence increments correctly
            setTimeout(() => {
              saveNext();
            }, 500);
          },
          error: (err: any) => {
            this.loadingService.setLoading(false);
            console.error(`Error saving PO ${pId}:`, err);
            this.showValidationError(`Failed to process PO ${pId}. Please check data.`);
          }
        });
      };

      saveNext();
      return;
    }

    const grnData = {
      poHeaderId: this.poId,
      supplierId: this.supplierId,
      gatePassNo: this.grnForm.getRawValue().gatePassNo,
      receivedDate: new Date(this.grnForm.getRawValue().receivedDate).toISOString(),
      remarks: this.grnForm.value.remarks,
      totalAmount: this.calculateGrandTotal(),
      status: 'Received',
      isQuick: this.isQuick,
      createdBy: currentUserId,
      companyId: this.authService.getCompanyId(),
      branchId: this.authService.getBranchId(),
      items: this.items.map(item => ({
        productId: item.productId,
        orderedQty: Number(item.orderedQty),
        receivedQty: Number(item.receivedQty),
        pendingQty: Number(item.pendingQty),
        rejectedQty: Number(item.rejectedQty),
        acceptedQty: Number(item.acceptedQty),
        unitRate: Number(item.unitRate),
        discountPercent: Number(item.discountPercent),
        gstPercent: Number(item.gstPercent),
        taxAmount: Number(item.taxAmount),
        totalAmount: Number(item.total),
        warehouseId: item.warehouseId,
        rackId: item.rackId,
        manufacturingDate: DateHelper.parseToISO(item.manufacturingDate),
        expiryDate: DateHelper.parseToISO(item.expiryDate)
      }))
    };

    console.log('� Full GRN Payload State:', { isQuick: this.isQuick, grnData });
    console.log('�🚀 Saving GRN Payload:', grnData);
    this.inventoryService.saveGRN({ Data: grnData }).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        // ✅ Mark this PO as done in sessionStorage so refresh won't re-save
        if (this.grnSavedKey) {
          sessionStorage.setItem(this.grnSavedKey, 'saved');
        }
        this.inventoryService.notifyInventoryChange();
        console.log('✅ GRN Save Success:', response);
        const grnNumber = response?.grnNumber || 'AUTO-GEN';

        const dialogRef = this.dialog.open(GrnSuccessDialogComponent, {
          width: '500px',
          disableClose: true,
          data: {
            grnNumber: grnNumber,
            grandTotal: this.calculateGrandTotal(),
            supplierId: this.supplierId,
            supplierName: this.supplierName
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result === 'make-payment') {
            this.performDirectPayment({
              grnNumber: grnNumber,
              grandTotal: this.calculateGrandTotal(),
              supplierId: this.supplierId
            });
          } else if (result === 'print') {
            // 🎯 DIRECT PRINT: Open print dialog and then go back to list
            this.dialog.open(GrnPrintDialogComponent, {
              width: '900px',
              maxWidth: '95vw',
              data: { grnNo: grnNumber },
              panelClass: 'grn-print-dialog'
            }).afterClosed().subscribe(() => {
              this.navigateBack();
            });
          } else {
            this.navigateBack();
          }
        });
      },
      error: (err) => {
        this.isSaving = false;
        console.group('❌ GRN Save Failure');
        console.error('Error Details:', err);
        console.error('Status:', err.status);
        console.error('Message:', err.error?.message || err.message);
        console.groupEnd();

        this.dialog.open(StatusDialogComponent, {
          width: '350px',
          data: {
            title: 'Error',
            message: 'Failed to save GRN. Please check console for technical details.',
            status: 'error',
            isSuccess: false
          }
        });
      }
    });
  }

  performDirectPayment(data: any) {
    console.log('🚀 Initiating Direct Payment with data:', data);

    if (!data.supplierId || data.supplierId <= 0) {
      this.dialog.open(StatusDialogComponent, {
        width: '400px',
        data: {
          isSuccess: false,
          title: 'Payment Error',
          message: `Cannot process payment. Supplier ID is missing or invalid.`,
          status: 'error'
        }
      });
      this.navigateBack();
      return;
    }

    const paymentPayload = {
      id: 0,
      supplierId: data.supplierId,
      amount: Number(data.grandTotal),
      totalAmount: Number(data.grandTotal),
      discountAmount: 0,
      netAmount: Number(data.grandTotal),
      paymentMode: 'Cash',
      referenceNumber: `${data.grnNumber}-${new Date().getTime().toString().slice(-4)}`,
      paymentDate: new Date().toISOString(),
      remarks: `Direct Payment for GRN: ${data.grnNumber}`,
      createdBy: localStorage.getItem('email') || 'Admin',
      companyId: this.authService.getCompanyId(),
      branchId: this.authService.getBranchId()
    };

    console.log('💰 Sending Payment Payload:', paymentPayload);

    setTimeout(() => {
      this.financeService.recordSupplierPayment(paymentPayload).subscribe({
        next: () => {
          console.log('✅ Direct Payment Successful');
          const statusDialog = this.dialog.open(StatusDialogComponent, {
            width: '350px',
            data: {
              isSuccess: true,
              title: 'Payment Successful',
              message: `Direct payment recorded for GRN ${data.grnNumber}.`,
              status: 'success'
            }
          });

          statusDialog.afterClosed().subscribe(() => {
            // Auto-print GRN bill after payment OK click
            this.dialog.open(GrnPrintDialogComponent, {
              width: '900px',
              maxWidth: '95vw',
              data: { grnNo: data.grnNumber },
              panelClass: 'grn-print-dialog'
            }).afterClosed().subscribe(() => {
              this.navigateBack();
            });
          });
        },
        error: (err) => {
          console.group('❌ Direct Payment Error');
          console.error(err);
          console.groupEnd();

          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: false,
              title: 'Payment Failed',
              message: `GRN saved but direct payment failed.`,
              status: 'error'
            }
          });
          this.navigateBack();
        }
      });
    }, 800);
  }

  navigateBack() {
    // Clear the sessionStorage flag when navigating away normally
    if (this.grnSavedKey) {
      sessionStorage.removeItem(this.grnSavedKey);
    }
    if (this.isQuick) {
      this.router.navigate(['/app/quick-inventory/grn-list']);
    } else {
      this.router.navigate(['/app/inventory/grn-list']);
    }
  }

  goBack() { this.navigateBack(); }
  onCancel() {
    this.clearCountdown();
    this.goBack();
  }

  showBulkCompletionDialog(uniqueSupplierId: number, uniqueSupplierName: string, processedGrns: any[], totalAmount: number) {
    if (uniqueSupplierId && processedGrns.length > 0) {
      const dialogRef = this.dialog.open(GrnSuccessDialogComponent, {
        width: '500px',
        disableClose: true,
        data: {
          grnNumber: processedGrns.length === 1 ? processedGrns[0].number : `${processedGrns.length} GRNs Created`,
          grandTotal: totalAmount,
          supplierId: uniqueSupplierId,
          supplierName: uniqueSupplierName
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        const bulkGrnNo = processedGrns.length === 1 ? processedGrns[0].number : `Bulk-${processedGrns.length}-GRN`;
        if (result === 'print') {
          // Print the first GRN or show all
          this.dialog.open(GrnPrintDialogComponent, {
            width: '900px',
            maxWidth: '95vw',
            data: { grnNo: processedGrns[0]?.number },
            panelClass: 'grn-print-dialog'
          });
        } else if (result === 'make-payment') {
          this.performDirectPayment({
            grnNumber: bulkGrnNo,
            grandTotal: totalAmount,
            supplierId: uniqueSupplierId
          });
        } else {
          this.navigateBack();
        }
      });
    } else {
      this.dialog.open(StatusDialogComponent, {
        width: '400px',
        data: {
          title: 'Bulk Process Completed',
          message: `Successfully generated ${processedGrns.length} GRNs for different suppliers. \n\nTotal Amount: ${totalAmount.toFixed(2)}. \n\nPlease record payments individually from the GRN list.`,
          status: 'success',
          isSuccess: true
        }
      }).afterClosed().subscribe(() => {
        this.navigateBack();
      });
    }
  }
}
