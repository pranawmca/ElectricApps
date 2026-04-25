import { ChangeDetectorRef, Component, OnInit, ViewChild, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { Product } from '../model/product.model';
import { ProductService } from '../service/product.service';
import { ServerDatagridComponent } from '../../../../shared/components/server-datagrid-component/server-datagrid-component';
import { MatDialog } from '@angular/material/dialog';
import { GridRequest } from '../../../../shared/models/grid-request.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';
import { LoadingService } from '../../../../core/services/loading.service';
import { LocationTrackerDialogComponent } from '../../../inventory/purchase-return/location-tracker-dialog/location-tracker-dialog.component';
import { SummaryStat, SummaryStatsComponent } from '../../../../shared/components/summary-stats-component/summary-stats-component';
import { PermissionService } from '../../../../core/services/permission.service';
import { PermissionDirective } from '../../../../core/directives/permission.directive';
import { SubCategoryService } from '../../subcategory/services/subcategory.service';
import { SubCategory } from '../../subcategory/modesls/subcategory.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';


@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MaterialModule, ServerDatagridComponent, SummaryStatsComponent, PermissionDirective],

  providers: [DatePipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit, OnDestroy {
  summaryStats: SummaryStat[] = [];
  private route = inject(ActivatedRoute);
  private permissionService = inject(PermissionService);

  loading = false;
  isDashboardLoading = true;
  private isFirstLoad = true;
  private loadingService = inject(LoadingService);
  totalCount = 0;
  selectedRows: any[] = [];
  lastRequest!: GridRequest;
  isLowStockFilterActive = false;

  canAdd: boolean = true;
  canDelete: boolean = true;

  @ViewChild(ServerDatagridComponent)
  grid!: ServerDatagridComponent<any>;

  private searchSubject = new Subject<string>();

  data: any[] = [];

  constructor(
    private service: ProductService,
    private subCategoryService: SubCategoryService, // Added
    private router: Router,
    private dialog: MatDialog,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef) { }

  nestedData: { [key: string]: Product[] } = {};
  nestedLoading: { [key: string]: boolean } = {};

  columns = [
    { field: 'categoryName', header: 'Category', sortable: true, width: 250, visible: true },
    { field: 'subcategoryName', header: 'Subcategory Name', sortable: true, width: 300, visible: true },
    { field: 'subcategoryCode', header: 'Subcategory Code', sortable: true, width: 150, visible: true },
    {
      field: 'isActive',
      header: 'Status',
      sortable: true, width: 100, visible: true,
      cell: (row: any) => row.isActive ? 'Active' : 'Inactive'
    }
  ];

  ngOnInit(): void {
    this.canAdd = this.permissionService.hasPermission('CanAdd');
    this.canDelete = this.permissionService.hasPermission('CanDelete');

    // Global loader ON
    this.isDashboardLoading = true;
    this.isFirstLoad = true;
    this.loadingService.setLoading(true);
    this.cdr.detectChanges();

    this.route.queryParams.subscribe(params => {
      this.isLowStockFilterActive = params['filter'] === 'lowstock';

      this.loadPriceLists({
        pageNumber: 1,
        pageSize: 10,
        sortDirection: 'desc'
      });
    });

    // Safety timeout - force stop loader after 10 seconds
    setTimeout(() => {
      if (this.isDashboardLoading) {
        console.warn('[ProductList] Force stopping loader after 10s timeout');
        this.isDashboardLoading = false;
        this.isFirstLoad = false;
        this.loadingService.setLoading(false);
        this.cdr.detectChanges();
      }
    }, 10000);

    // Initialize Product Search Debounce
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(value => {
      this.executeProductSearch(value);
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  loadPriceLists(request: GridRequest): void {
    this.loading = true;
    this.lastRequest = request;
    
    // 🚀 Start Global Loader
    this.loadingService.setLoading(true);
    this.cdr.detectChanges();

    this.subCategoryService.getPaged(request).subscribe({
      next: res => {
        // Normalize IDs and property names for consistent access
        this.data = (res.items as any[]).map(x => ({ 
          ...x, 
          id: x.id || x.Id,
          categoryId: x.categoryId || x.CategoryId,
          categoryName: x.categoryName || x.CategoryName,
          subcategoryName: x.subcategoryName || x.SubcategoryName,
          subcategoryCode: x.subcategoryCode || x.SubcategoryCode,
          isActive: x.isActive !== undefined ? x.isActive : x.IsActive
        })); 
        this.totalCount = res.totalCount;

        this.summaryStats = [
          { label: 'Subcategories', value: this.totalCount, icon: 'category', type: 'total' },
          { label: 'Hierarchy View', value: 'Enabled', icon: 'account_tree', type: 'info' },
          { label: 'Products', value: 'Categorized', icon: 'inventory_2', type: 'info' }
        ];

        this.loading = false;
        this.isFirstLoad = false;
        this.isDashboardLoading = false;
        
        // ✅ Stop Global Loader
        this.loadingService.setLoading(false);
        this.cdr.detectChanges();
      },
      error: err => {
        this.loading = false;
        this.isFirstLoad = false;
        this.isDashboardLoading = false;
        
        // ✅ Stop Global Loader on Error
        this.loadingService.setLoading(false);
        this.cdr.detectChanges();
      }
    });
  }

  loadNestedProducts(subcategory: any): void {
    const subId = subcategory.id || subcategory.Id;
    if (!subId) return;
    
    // Only skip if we already have actual data
    if (this.nestedData[subId] && this.nestedData[subId].length > 0) return;

    const filters: any = { 'subcategoryid': subId };
    
    // Pass along the product search term if active
    if (this.lastRequest?.filters && this.lastRequest.filters['productName']) {
      filters['productName'] = this.lastRequest.filters['productName'];
    }

    this.nestedLoading[subId] = true;
    const request: GridRequest = {
      pageNumber: 1,
      pageSize: 100,
      sortBy: 'productName',
      sortDirection: 'asc',
      filters: filters
    };

    this.service.getPaged(request).subscribe({
      next: (res) => {
        this.nestedData[subId] = (res.items as any[]).map(p => ({ 
          ...p, 
          id: p.id || p.Id,
          productName: p.productName || p.ProductName || p.name || p.Name,
          sku: p.sku || p.Sku,
          unit: p.unit || p.Unit,
          basePurchasePrice: p.basePurchasePrice || p.BasePurchasePrice,
          saleRate: p.saleRate || p.SaleRate,
          mrp: p.mrp || p.MRP,
          currentStock: p.currentStock !== undefined ? p.currentStock : p.CurrentStock,
          minStock: p.minStock !== undefined ? p.minStock : p.MinStock,
          defaultGst: p.defaultGst !== undefined ? p.defaultGst : p.DefaultGst
        }));
        this.nestedLoading[subId] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.nestedLoading[subId] = false;
        this.cdr.detectChanges();
      }
    });
  }

  // NAYA: Purchase Order page par redirect karne ke liye
  navigateToCreatePO(row: any) {
    if (row.currentStock <= row.minStock) {
      const refillData = {
        productName: row.productName,
        productId: row.id,
        unit: row.unit,
        rate: row.basePurchasePrice || row.rate || 0,
        gstPercent: row.defaultGst || row.gstPercent || 0,
        suggestedQty: row.minStock - row.currentStock > 0 ? row.minStock - row.currentStock : 10
      };

      this.router.navigate(['/app/inventory/polist/add'], {
        state: { refillData }
      });
    }
  }

  // BULK REORDER: Selected products ko PO form mein transfer karne ke liye
  bulkReorder() {
    if (this.selectedRows.length === 0) return;

    // Filter rows that have product details (in case subcategories were selected)
    const refillData = this.selectedRows
      .filter(row => row.productName || row.id)
      .map(row => ({
        productName: row.productName || row.subcategoryName || 'Unknown Product',
        productId: row.id,
        unit: row.unit || 'Nos',
        rate: row.basePurchasePrice || row.rate || 0,
        gstPercent: row.defaultGst || row.gstPercent || 0,
        suggestedQty: row.minStock - row.currentStock > 0 ? row.minStock - row.currentStock : 10
      }));

    this.router.navigate(['/app/inventory/polist/add'], {
      state: { refillData }
    });
  }

  clearFilter(): void {
    this.router.navigate(['/app/master/products']);
  }

  onEdit(row: any): void {
    const isProduct = !!row.productName;
    const name = isProduct ? row.productName : row.subcategoryName;
    const type = isProduct ? 'Product' : 'Subcategory';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: `Edit ${type}`,
        message: `Are you sure you want to edit ${type.toLowerCase()}: ${name}?`,
        confirmText: 'Yes, Edit'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (isProduct) {
          this.router.navigate(['/app/master/products/edit', row.id]);
        } else {
          this.router.navigate(['/app/master/subcategories/edit', row.id]);
        }
      }
    });
  }

  deleteProduct(row: any): void {
    const isProduct = !!row.productName;
    const name = isProduct ? row.productName : row.subcategoryName;
    const type = isProduct ? 'Product' : 'Subcategory';

    this.dialog.open(ConfirmDialogComponent, {
      data: { 
        title: 'Confirm Delete', 
        message: `Are you sure you want to delete this ${type.toLowerCase()} (${name})?` 
      }
    })
      .afterClosed().subscribe(confirm => {
        if (!confirm) return;

        this.loading = true;
        this.loadingService.setLoading(true);
        
        const deleteObs = isProduct ? this.service.delete(row.id) : this.subCategoryService.delete(row.id);

        deleteObs.subscribe({
          next: () => {
            this.loading = false;
            this.loadingService.setLoading(false);
            this.loadPriceLists(this.lastRequest);
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.loadingService.setLoading(false);
            this.cdr.detectChanges();
          }
        });
      });
  }

  reloadGrid(): void {
    this.loadPriceLists(this.lastRequest);
  }

  confirmBulkDelete(): void {
    if (!this.selectedRows.length) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title: 'Delete product List', message: `Are you sure you want to delete ${this.selectedRows.length} selected items?` }
    }).afterClosed().subscribe(confirm => {
      if (!confirm) return;
      const ids = this.selectedRows.map(x => x.id);
      this.loading = true;
      this.service.deleteMany(ids).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.cdr.detectChanges();
          this.grid.clearSelection();
          this.dialog.open(StatusDialogComponent, { data: { isSuccess: true, message: res.message } });
          this.loadPriceLists(this.lastRequest);
        },
        error: (err: any) => {
          this.loading = false;
          this.dialog.open(StatusDialogComponent, { data: { isSuccess: false, message: err?.error?.message || 'Error' } });
        }
      });
    });
  }

  onSelectionChange(rows: any[]) {
    this.selectedRows = rows;
  }

  onProductSearch(value: string): void {
    this.searchSubject.next(value);
  }

  private executeProductSearch(value: string): void {
    if (!this.lastRequest) return;
    
    const term = value?.trim();
    if (term) {
      this.lastRequest.filters = { ...this.lastRequest.filters, 'productName': term };
    } else if (this.lastRequest.filters) {
      delete this.lastRequest.filters['productName'];
    }
    
    this.lastRequest.pageNumber = 1;
    this.loadPriceLists(this.lastRequest);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.loadingService.setLoading(true);
      this.service.uploadExcel(file).subscribe({
        next: (res) => {
          setTimeout(() => {
            this.loading = false;
            this.loadingService.setLoading(false);
            this.cdr.detectChanges();
            
            this.dialog.open(StatusDialogComponent, {
              width: '600px',
              data: {
                isSuccess: !res.errors || res.errors.length === 0,
                title: res.errors?.length > 0 ? 'Upload Completed with Errors' : 'Success',
                message: res.message,
                errors: res.errors,
                status: res.errors?.length > 0 ? 'warning' : 'success'
              }
            });
            
            this.reloadGrid();
          }, 800);
        },
        error: (err) => {
          this.loading = false;
          this.loadingService.setLoading(false);
          console.error('Upload error', err);
          this.dialog.open(StatusDialogComponent, {
            data: { isSuccess: false, message: 'Failed to upload products.' }
          });
          this.cdr.detectChanges();
        }
      });

      // Clear input
      event.target.value = '';
    }
  }

  downloadTemplate(): void {
    this.loadingService.setLoading(true);
    this.service.downloadTemplate().subscribe({
      next: blob => {
        setTimeout(() => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Product_Template.xlsx';
          a.click();
          window.URL.revokeObjectURL(url);
          this.loadingService.setLoading(false);
          this.cdr.detectChanges();
        }, 800);
      },
      error: () => {
        this.loadingService.setLoading(false);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * 🔄 Re-calculate all product stock from transactions
   */
  syncAllStock() {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Sync All Stock',
        message: 'This will re-calculate current stock for all products based on all historical transactions. Continue?',
        confirmText: 'Yes, Sync Now'
      }
    }).afterClosed().subscribe(confirm => {
      if (!confirm) return;

      this.loading = true;
      this.loadingService.setLoading(true);
      this.cdr.detectChanges();

      this.service.syncStock().subscribe({
        next: (res: any) => {
          setTimeout(() => {
            this.loading = false;
            this.loadingService.setLoading(false);
            this.dialog.open(StatusDialogComponent, {
              data: { isSuccess: true, message: res.message || 'Stock synchronized successfully!' }
            });
            this.reloadGrid(); // Refresh the list to show new counts
            this.cdr.detectChanges();
          }, 800);
        },
        error: (err: any) => {
          this.loading = false;
          this.loadingService.setLoading(false);
          const errorMessage = err?.error?.message || err?.message || 'Sync failed. Please try again later.';
          this.dialog.open(StatusDialogComponent, {
            data: { isSuccess: false, message: errorMessage }
          });
          this.cdr.detectChanges();
        }
      });
    });
  }

  scrollToTop() {
    const container = document.querySelector('.content') || window;
    container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToBottom() {
    const container = document.querySelector('.content');
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }
}
