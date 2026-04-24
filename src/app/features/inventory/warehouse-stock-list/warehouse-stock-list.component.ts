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
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = ['productName', 'sku', 'warehouseName', 'quantity', 'minStock', 'status'];
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
          
          // Generate Summary Stats
          this.summaryStats = [
            { label: 'Unique Products', value: data.totalCount, icon: 'inventory_2', type: 'total' },
            { label: 'Low Stock Items', value: data.items.filter((i: any) => i.isLowStock).length, icon: 'warning', type: 'warning' },
            { label: 'Total Qty', value: data.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0), icon: 'bolt', type: 'success' }
          ];

          return data.items;
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
        this.dataSource.data = data.items;
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
