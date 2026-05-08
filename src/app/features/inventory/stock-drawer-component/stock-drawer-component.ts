import { Component, OnInit, inject, Input, Output, EventEmitter, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { InventoryService } from '../service/inventory.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../company/services/company.service';

@Component({
  selector: 'app-stock-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './stock-drawer-component.html',
  styleUrl: './stock-drawer-component.scss',
  animations: [
    trigger('drawerSlide', [
      state('closed', style({ transform: 'translateX(100%)' })),
      state('open', style({ transform: 'translateX(0)' })),
      transition('closed <=> open', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', opacity: 0 })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class StockDrawerComponent implements OnInit, OnDestroy {
  private inventoryService = inject(InventoryService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private destroy$ = new Subject<void>();

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  stockItems: any[] = [];
  branchMap = new Map<string, string>();
  isLoading = false;
  searchSubject = new Subject<string>();
  searchTerm = '';
  expandedProductId: number | null = null;

  totalStockItems = 0;
  totalAvailableQty = 0;

  get isPurchaseContext(): boolean {
    return this.router.url.includes('/purchase/');
  }

  ngOnInit() {
    this.loadBranches();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm = term;
      this.loadStock();
    });

    this.inventoryService.inventoryUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Inventory updated elsewhere. Refreshing stock drawer...');
        this.loadStock();
      });

    this.loadStock();
  }

  loadBranches() {
    const companyId = this.authService.getCompanyId();
    if (companyId) {
      this.companyService.getBranchesByCompany(companyId).subscribe((data: any) => {
        if (data) {
          data.forEach((b: any) => {
            const bId = b.id || b.branchId;
            const bName = b.branchName || b.name || b.address;
            if (bId) this.branchMap.set(bId.toString(), bName);
          });
          this.cdr.detectChanges();
          this.loadStock();
        }
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStock() {
    this.isLoading = true;
    this.inventoryService.getCurrentStock(
      'productName',
      'asc',
      0,
      50, // Load first 50 items for quick view
      this.searchTerm,
      null, // startDate
      null, // endDate
      null, // warehouseId
      null, // rackId
      true, // showPurged
      this.authService.getBranchId()
    ).subscribe({
      next: (data) => {
        this.stockItems = data.items.map((item: any) => {
          let activeExpiryDate = item.expiryDate;
          
          // 🎯 Fix: If we have batch history, find the REAL expiry date of the stock we actually have
          if (item.history && item.history.length > 0) {
            
            // Fix UTC to Local timezone conversion for batch dates
            item.history.forEach((h: any) => {
              if (h.receivedDate && typeof h.receivedDate === 'string' && !h.receivedDate.includes('Z') && !h.receivedDate.includes('+')) {
                h.receivedDate = h.receivedDate + 'Z';
              }
            });

            const validStockBatches = item.history.filter((h: any) => (h.availableQty || 0) > 0);
            if (validStockBatches.length > 0) {
              // Get the earliest expiry date among batches that HAVE stock
              const dates = validStockBatches
                .map((h: any) => h.expiryDate)
                .filter((d: any) => d && d !== 'NA')
                .map((d: any) => new Date(d).getTime());
              
              if (dates.length > 0) {
                activeExpiryDate = new Date(Math.min(...dates));
              }
            }
          }

          let transferredBranchName = '';
          if (item.transferredBranchId && this.branchMap.has(item.transferredBranchId.toString())) {
            transferredBranchName = this.branchMap.get(item.transferredBranchId.toString()) || '';
          } else if (item.transferredBranchId) {
            transferredBranchName = item.transferredBranchId;
          }

          if (item.history) {
            item.history.forEach((h: any) => {
              if (h.branchId && this.branchMap.has(h.branchId.toString())) {
                h.branchName = this.branchMap.get(h.branchId.toString());
              } else if (h.branchId) {
                h.branchName = h.branchId;
              } else {
                h.branchName = 'Global View';
              }
            });
          }

          return {
            ...item,
            expiryDate: activeExpiryDate,
            currentStock: item.availableStock || 0,
            transferredBranchName: transferredBranchName
          };
        });
        this.updateSummary();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateSummary() {
    this.totalStockItems = this.stockItems.length;
    this.totalAvailableQty = this.stockItems.reduce((acc, curr) => acc + (curr.availableStock || 0), 0);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  toggleExpand(productId: number) {
    this.expandedProductId = this.expandedProductId === productId ? null : productId;
  }

  closeDrawer() {
    this.close.emit();
  }

  isExpired(date: any): boolean {
    // Suppress expired status labels in Purchase workflow as per user request
    if (this.router.url.includes('/purchase/')) return false;

    if (!date || date === 'NA') return false;
    const expDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expDate <= today;
  }

  isNearExpiry(date: any): boolean {
    if (!date || date === 'NA') return false;
    const expDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(today.getDate() + 15);
    return expDate > today && expDate <= fifteenDaysFromNow;
  }

  isLowStock(element: any): boolean {
    if (!element) return false;
    return element.availableStock <= (element.minStockLevel || 10);
  }
}
