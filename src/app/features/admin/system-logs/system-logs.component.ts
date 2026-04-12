import { Component, OnInit, ViewChild, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { SystemLogService, SystemLog } from '../services/system-log.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoadingService } from '../../../core/services/loading.service';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';

@Component({
  selector: 'app-system-logs',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './system-logs.component.html',
  styleUrl: './system-logs.component.scss'
})
export class SystemLogsComponent implements OnInit {
  private logService = inject(SystemLogService);
  private loadingService = inject(LoadingService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['timeStamp', 'serviceName', 'level', 'message', 'actions'];
  dataSource = new MatTableDataSource<SystemLog>([]);
  serviceNames: string[] = [];
  logLevels: string[] = [];
  
  // Pagination & Sort State
  totalCount = 0;
  pageSize = 10;
  pageIndex = 0;
  searchTerm = '';
  sortBy = 'TimeStamp';
  sortOrder = 'DESC';
  
  filterService: string = '';
  filterLevel: string = '';
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.loadLogs();
    this.loadServiceNames();
    this.loadLogLevels();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.loadingService.setLoading(true, 'Fetching System Logs...');
    
    // Server-side call with a small artificial delay so the global loader is visible to the user
    setTimeout(() => {
      this.logService.getLogs(
        this.pageIndex + 1, 
        this.pageSize, 
        this.filterLevel, 
        this.filterService, 
        this.searchTerm,
        this.sortBy,
        this.sortOrder
      ).subscribe({
        next: (response) => {
          this.dataSource.data = response.items;
          this.totalCount = response.totalCount;
          this.isLoading = false;
          this.loadingService.setLoading(false);
        },
        error: (err) => {
          console.error('Error fetching logs', err);
          this.dialog.open(StatusDialogComponent, {
            data: {
              isSuccess: false,
              title: 'Load Failed',
              message: 'Could not connect to the system logs service. Please ensure all microservices are running.',
              status: 'error'
            }
          });
          this.isLoading = false;
          this.loadingService.setLoading(false);
        }
      });
    }, 400); // 400ms delay for visual feedback
  }

  onSort(sort: Sort): void {
    // Convert camelCase to PascalCase for backend column names if necessary
    // Example: timeStamp -> TimeStamp
    const pascalSort = sort.active.charAt(0).toUpperCase() + sort.active.slice(1);
    
    this.sortBy = pascalSort;
    this.sortOrder = sort.direction ? sort.direction.toUpperCase() : 'DESC';
    this.pageIndex = 0;
    this.loadLogs();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadLogs();
  }

  loadServiceNames(): void {
    this.logService.getServiceNames().subscribe({
      next: (names) => this.serviceNames = names
    });
  }

  loadLogLevels(): void {
    const standardLevels = ['Verbose', 'Debug', 'Information', 'Warning', 'Error', 'Fatal'];
    this.logService.getLevels().subscribe({
      next: (serverLevels) => {
        // Combine standard levels with any custom ones from the server, removing duplicates
        const combined = [...new Set([...standardLevels, ...serverLevels])];
        this.logLevels = combined.sort();
      },
      error: () => {
        // Fallback to standard levels if API fails
        this.logLevels = standardLevels;
      }
    });
  }

  private searchTimeout: any;

  onSearchInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Debounce for 500ms before triggering search
    this.searchTimeout = setTimeout(() => {
      this.pageIndex = 0;
      this.loadLogs();
    }, 500);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadLogs();
  }

  applySearch(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchTerm = filterValue.trim();
    this.pageIndex = 0;
    this.loadLogs();
  }

  viewDetails(log: SystemLog): void {
     this.dialog.open(LogDetailsDialog, {
       data: log,
       width: '800px'
     });
  }

  clearAllLogs(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Action',
        message: 'Are you sure you want to clear all system logs? This cannot be undone.',
        confirmText: 'Yes, Clear All',
        cancelText: 'No, Keep Them',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.loadingService.setLoading(true, 'Cleaning System Logs Database...');

        // Artificial delay of 500ms so the user can actually see the global loader
        setTimeout(() => {
          this.logService.clearLogs().subscribe({
            next: () => {
              this.dialog.open(StatusDialogComponent, {
                data: {
                  isSuccess: true,
                  title: 'Logs Cleared',
                  message: 'All system logs have been permanently deleted.',
                  status: 'success'
                }
              });
              this.pageIndex = 0;
              this.loadLogs();
            },
            error: (err) => {
              console.error('Full Error Object:', err);
              // Extracting the real error message if available
              const errorMsg = err.error?.message || err.message || 'The database table might be locked or service could be unavailable.';
              
              this.dialog.open(StatusDialogComponent, {
                data: {
                  isSuccess: false,
                  title: 'Operation Failed',
                  message: `System Error: ${errorMsg}`,
                  status: 'error'
                }
              });
              this.isLoading = false;
              this.loadingService.setLoading(false);
            }
          });
        }, 500);
      }
    });
  }
}

@Component({
  selector: 'log-details-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  template: `
    <h2 mat-dialog-title class="text-danger">Exception Detail</h2>
    <mat-dialog-content class="mat-typography">
      <div class="bg-light p-3 rounded" style="font-family: monospace; white-space: pre-wrap; font-size: 12px; color: #991b1b; max-height: 400px; overflow-y: auto;">
        {{data.exception}}
      </div>
      <div class="mt-3">
        <strong>Correlation ID:</strong> {{data.correlationId || 'N/A'}}<br>
        <strong>Service:</strong> {{data.serviceName}}
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `
})
export class LogDetailsDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
