import { ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
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


@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MaterialModule, ServerDatagridComponent, SummaryStatsComponent, PermissionDirective],

  providers: [DatePipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList implements OnInit {
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

  data: Product[] = [];

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
  }

  loadPriceLists(request: GridRequest): void {
    this.loading = true;
    this.lastRequest = request;
    this.cdr.detectChanges();

    this.subCategoryService.getPaged(request).subscribe({
      next: res => {
        this.data = res.items as any; // Subcategories
        this.totalCount = res.totalCount;

        this.summaryStats = [
          { label: 'Subcategories', value: this.totalCount, icon: 'category', type: 'total' },
          { label: 'Hierarchy View', value: 'Enabled', icon: 'account_tree', type: 'info' },
          { label: 'Products', value: 'Categorized', icon: 'inventory_2', type: 'info' }
        ];

        this.loading = false;
        if (this.isFirstLoad) {
          this.isFirstLoad = false;
          this.isDashboardLoading = false;
          this.loadingService.setLoading(false);
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.loading = false;
        if (this.isFirstLoad) {
          this.isFirstLoad = false;
          this.isDashboardLoading = false;
          this.loadingService.setLoading(false);
        }
        this.cdr.detectChanges();
      }
    });
  }

  loadNestedProducts(subcategory: any): void {
    if (this.nestedData[subcategory.id]) return;

    this.nestedLoading[subcategory.id] = true;
    const request: GridRequest = {
      pageNumber: 1,
      pageSize: 100, // Load all products for the subcategory
      filters: {
        'subcategoryid': subcategory.id 
      }
    };

    this.service.getPaged(request).subscribe({
      next: (res) => {
        this.nestedData[subcategory.id] = res.items;
        this.nestedLoading[subcategory.id] = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.nestedLoading[subcategory.id] = false;
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

    const refillData = this.selectedRows.map(row => ({
      productName: row.productName,
      productId: row.id,
      unit: row.unit,
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Edit Product',
        message: `Are you sure you want to edit product: ${row.productName}?`,
        confirmText: 'Yes, Edit'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/app/master/products/edit', row.id]);
      }
    });
  }

  deleteProduct(category: any): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Confirm Delete', message: 'Are you sure you want to delete this product list?' }
    })
      .afterClosed().subscribe(confirm => {
        if (!confirm) return;
        this.loading = true;
        this.service.delete(category.id).subscribe({
          next: (res: any) => {
            this.loading = false;
            this.cdr.detectChanges();
            this.dialog.open(StatusDialogComponent, { data: { isSuccess: true, message: res.message } });
            this.loadPriceLists(this.lastRequest);
          },
          error: (err: any) => {
            this.loading = false;
            this.dialog.open(StatusDialogComponent, { data: { isSuccess: false, message: err?.error?.message || 'Unable to delete' } });
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

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.loading = true;
      this.cdr.detectChanges();

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
}
