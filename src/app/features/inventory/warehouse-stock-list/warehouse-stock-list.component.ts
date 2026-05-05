import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { InventoryService } from '../service/inventory.service';
import { Subject, merge, of } from 'rxjs';
import { startWith, switchMap, map, catchError, takeUntil } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoadingService } from '../../../core/services/loading.service';
import { NotificationService } from '../../shared/notification.service';
import { SummaryStat, SummaryStatsComponent } from '../../../shared/components/summary-stats-component/summary-stats-component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-warehouse-stock-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FormsModule, SummaryStatsComponent],
  templateUrl: './warehouse-stock-list.component.html',
  styleUrl: './warehouse-stock-list.component.scss'
})
export class WarehouseStockListComponent implements OnInit, AfterViewInit {
  private inventoryService = inject(InventoryService);
  private loadingService = inject(LoadingService);
  private notification = inject(NotificationService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();
  
  displayedColumns: string[] = ['productName', 'sku', 'warehouseName', 'branchName', 'companyName', 'quantity', 'minStock', 'status'];
  dataSource = new MatTableDataSource<any>([]);
  
  resultsLength = 0;
  isLoadingResults = true;
  searchValue: string = '';
  summaryStats: SummaryStat[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.loadingService.setLoading(true);
  }

  ngAfterViewInit() {
    this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.inventoryService.getWarehouseStock(
            this.searchValue,
            this.sort.active,
            this.sort.direction,
            this.paginator.pageIndex,
            this.paginator.pageSize
          ).pipe(catchError(() => of(null)));
        }),
        map(data => {
          this.isLoadingResults = false;
          this.loadingService.setLoading(false);

          if (data === null) return [];

          this.resultsLength = data.totalCount;

          const currentCompanyName = this.authService.getCompanyName();
          const currentBranchName = this.authService.getBranchName();
          
          const mappedItems = (data.items || []).map((item: any) => ({
            ...item,
            // If branchId is a Guid-like string, it might not be the name. 
            // But if it's already a name, use it.
            branchName: item.branchId === this.authService.getBranchId() ? currentBranchName : item.branchId,
            companyName: item.companyId === this.authService.getCompanyId() ? currentCompanyName : (item.companyName || 'Bipin Kirana store')
          }));
          
          // Generate Summary Stats
          this.summaryStats = [
            { label: 'Unique Products', value: data.totalCount, icon: 'inventory_2', type: 'total' },
            { label: 'Low Stock Items', value: mappedItems.filter((i: any) => i.isLowStock).length, icon: 'warning', type: 'warning' },
            { label: 'Total Qty', value: mappedItems.reduce((acc: number, curr: any) => acc + curr.quantity, 0), icon: 'bolt', type: 'success' }
          ];

          return mappedItems;
        })
      ).subscribe(data => {
        this.dataSource.data = data;
      });
  }

  applyFilter(event: Event) {
    this.searchValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.paginator.pageIndex = 0;
    this.refreshData();
  }

  refreshData() {
    this.isLoadingResults = true;
    this.inventoryService.getWarehouseStock(
      this.searchValue,
      this.sort.active,
      this.sort.direction,
      this.paginator.pageIndex,
      this.paginator.pageSize
    ).subscribe(data => {
      this.isLoadingResults = false;
      if (data) {
        this.resultsLength = data.totalCount;
        
        const currentCompanyName = this.authService.getCompanyName();
        const currentBranchName = this.authService.getBranchName();
        
        const mappedItems = (data.items || []).map((item: any) => ({
          ...item,
          branchName: item.branchId === this.authService.getBranchId() ? currentBranchName : item.branchId,
          companyName: item.companyId === this.authService.getCompanyId() ? currentCompanyName : (item.companyName || 'Bipin Kirana store')
        }));

        this.dataSource.data = mappedItems;
      }
    });
  }

  onSyncStock() {
    this.loadingService.setLoading(true);
    this.inventoryService.syncStock().subscribe({
      next: (res: any) => {
        this.notification.showStatus(true, 'Stock synchronized successfully.');
        this.refreshData();
        this.loadingService.setLoading(false);
      },
      error: () => {
        this.notification.showStatus(false, 'Failed to synchronize stock.');
        this.loadingService.setLoading(false);
      }
    });
  }
}
