import { Component, OnInit, ViewChild, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SystemLogService, SystemLog } from '../services/system-log.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LoadingService } from '../../../core/services/loading.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = ['timeStamp', 'serviceName', 'level', 'message', 'actions'];
  dataSource = new MatTableDataSource<SystemLog>([]);
  serviceNames: string[] = [];
  
  filterService: string = '';
  filterLevel: string = '';
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit(): void {
    this.loadLogs();
    this.loadServiceNames();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.loadingService.setLoading(true);
    
    this.logService.getLogs(this.filterLevel, this.filterService).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.isLoading = false;
        this.loadingService.setLoading(false);
      },
      error: (err) => {
        console.error('Error fetching logs', err);
        this.snackBar.open('Error loading logs. Make sure backend is running.', 'Close', { duration: 3000 });
        this.isLoading = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  loadServiceNames(): void {
    this.logService.getServiceNames().subscribe({
      next: (names) => this.serviceNames = names
    });
  }

  onFilterChange(): void {
    this.loadLogs();
  }

  applySearch(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  viewDetails(log: SystemLog): void {
     // Yahan aap ek dialog open kar sakte hain stack trace dikhane ke liye
     this.dialog.open(LogDetailsDialog, {
       data: log,
       width: '800px'
     });
  }

  clearAllLogs(): void {
    if (confirm('Are you sure you want to clear all system logs? This cannot be undone.')) {
      this.logService.clearLogs().subscribe({
        next: () => {
          this.snackBar.open('Logs cleared successfully', 'OK', { duration: 2000 });
          this.loadLogs();
        }
      });
    }
  }
}

// Internal Dialog Component for Exception details
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
