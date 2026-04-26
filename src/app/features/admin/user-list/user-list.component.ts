import { Component, Inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../../core/services/user.service';
import { User, RegisterUserDto } from '../../../core/models/user.model';
import { UserFormComponent } from './user-form.component';
import { RoleService } from '../../../core/services/role.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';

import { SummaryStat, SummaryStatsComponent } from '../../../shared/components/summary-stats-component/summary-stats-component';
import { LoadingService } from '../../../core/services/loading.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, SummaryStatsComponent],
  template: `
    <div class="list-container" [class.disabled-content]="loading">
      <div class="header-actions">
        <div class="title-section">
          <h1>User Management</h1>
          <p class="subtitle">Search, manage and monitor system users across all tenants</p>
        </div>
        <button mat-raised-button class="main-add-btn" (click)="createUser()">
           <mat-icon>add</mat-icon> Create User
        </button>
      </div>

      <!-- 🔎 TOP SEARCH BAR -->
      <div class="search-panel">
         <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search Users</mat-label>
            <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" placeholder="Search by name or email...">
            <mat-icon matPrefix>search</mat-icon>
            <button *ngIf="searchTerm" matSuffix mat-icon-button (click)="searchTerm=''; loadUsers()">
               <mat-icon>close</mat-icon>
            </button>
         </mat-form-field>
      </div>

      <app-summary-stats [stats]="summaryStats" [isLoading]="loading"></app-summary-stats>
      
      <div class="table-container-wrapper">
        <div class="grid-wrapper">
          <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSortChange($event)">
            <!-- Username Column -->
            <ng-container matColumnDef="userName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Username </th>
              <td mat-cell *matCellDef="let element" class="username-cell"> {{element.userName}} </td>
            </ng-container>

            <!-- Email Column -->
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Email </th>
              <td mat-cell *matCellDef="let element"> {{element.email}} </td>
            </ng-container>

            <!-- Roles Column -->
            <ng-container matColumnDef="roles">
              <th mat-header-cell *matHeaderCellDef> Roles </th>
              <td mat-cell *matCellDef="let element"> 
                <div class="role-chips">
                   <span *ngFor="let role of element.roles" 
                         class="role-badge" 
                         [class.root-badge]="role === 'Default Admin'">
                     {{role}}
                   </span>
                </div>
              </td>
            </ng-container>

            <!-- Company Column -->
            <ng-container matColumnDef="companyName">
              <th mat-header-cell *matHeaderCellDef> Company </th>
              <td mat-cell *matCellDef="let element"> {{element.companyName || 'System'}} </td>
            </ng-container>

            <!-- Audit: Created Column -->
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef> Created </th>
              <td mat-cell *matCellDef="let element">
                <div class="audit-cell">
                  <span class="audit-user">{{element.createdBy || 'System'}}</span>
                  <span class="audit-date">{{element.createdDate | date:'short'}}</span>
                </div>
              </td>
            </ng-container>

            <!-- Audit: Modified Column -->
            <ng-container matColumnDef="modified">
              <th mat-header-cell *matHeaderCellDef> Modified </th>
              <td mat-cell *matCellDef="let element">
                <div class="audit-cell" *ngIf="element.lastModifiedBy">
                  <span class="audit-user">{{element.lastModifiedBy}}</span>
                  <span class="audit-date">{{element.lastModifiedDate | date:'short'}}</span>
                </div>
                <span class="text-muted" *ngIf="!element.lastModifiedBy">-</span>
              </td>
            </ng-container>
            
            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef> Status </th>
              <td mat-cell *matCellDef="let element">
                <div class="status-wrapper">
                  <mat-slide-toggle [checked]="element.isActive" 
                                    [disabled]="element.roles.includes('Default Admin')"
                                    (change)="toggleStatus(element, $event.checked)" 
                                    color="primary">
                    <span class="status-text" [class.active]="element.isActive">{{element.isActive ? 'Active' : 'Inactive'}}</span>
                  </mat-slide-toggle>
                </div>
              </td>
            </ng-container>
            
            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Actions </th>
              <td mat-cell *matCellDef="let element">
                <div class="action-buttons">
                  <button mat-icon-button 
                          (click)="editUser(element)" 
                          [disabled]="element.roles.includes('Default Admin')"
                          matTooltip="Edit User">
                    <mat-icon [color]="element.roles.includes('Default Admin') ? '' : 'accent'">edit</mat-icon>
                  </button>
                  <button mat-icon-button 
                          (click)="deleteUser(element)" 
                          [disabled]="element.roles.includes('Default Admin')"
                          matTooltip="Delete User">
                    <mat-icon [color]="element.roles.includes('Default Admin') ? '' : 'warn'">delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" sticky></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="user-row"></tr>

            <!-- No Data Found Row -->
            <tr class="mat-row empty-row" *matNoDataRow>
              <td class="mat-cell" colspan="6">
                No users matching the search "{{searchTerm}}"
              </td>
            </tr>
          </table>
        </div>
        
        <mat-paginator 
            [length]="totalCount"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 20, 50]" 
            (page)="onPageChange($event)"
            showFirstLastButtons 
            class="user-paginator">
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .disabled-content {
      pointer-events: none;
      user-select: none;
      opacity: 0.5;
      filter: blur(2px);
    }

    :host {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px); 
      overflow: hidden;
      padding: 4px 20px 20px 20px;
      box-sizing: border-box;
      background-color: #f8fafc;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .list-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-shrink: 0;

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
        letter-spacing: -0.5px;
        margin: 0;
      }
    }

    .title-section {
       h1 { margin-bottom: 4px !important; }
       .subtitle { color: #64748b; font-size: 13px; margin: 0; }
    }

    .main-add-btn {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
      color: white !important;
      box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3) !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
      height: 40px !important;
      padding: 0 16px !important;
      transition: all 0.3s ease !important;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4) !important;
      }
      
      mat-icon {
        margin-right: 8px;
      }
    }

    .search-panel {
       padding: 0 0 16px 0;
       .search-field { width: 100%; max-width: 400px; }
       ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    }

    .table-container-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .grid-wrapper {
      flex: 1;
      overflow: auto;
      
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;

        th.mat-header-cell {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 16px;
          border-bottom: 2px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        td.mat-cell {
          padding: 16px;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 1px solid #f1f5f9;
        }

        .user-row {
          transition: background-color 0.2s;
          cursor: pointer;
          &:hover { background-color: #f8fafc; }
        }

        .empty-row {
          text-align: center;
          height: 100px;
          color: #64748b;
          font-style: italic;
        }

        .username-cell {
          font-weight: 600;
          color: #4f46e5;
        }

        .audit-cell {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
          .audit-user { font-weight: 600; font-size: 11px; color: #475569; }
          .audit-date { font-size: 10px; color: #94a3b8; }
        }
      }
    }

    .role-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .role-badge {
      background: #f1f5f9;
      color: #475569;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
      
      &.root-badge {
        background: #fee2e2 !important;
        color: #ef4444 !important;
        border: 1px solid #fecaca !important;
      }
    }

    .status-wrapper {
      display: flex;
      align-items: center;
    }

    .status-text {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-left: 8px;
      &.active { color: #10b981; }
    }

    .user-paginator {
      border-top: 1px solid #e2e8f0;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    :host-context(.dark-mode) {
      background-color: #1e293b !important;

      .header-actions h1 { color: #f8fafc !important; }
      .subtitle { color: rgba(255,255,255,0.6) !important; }

      .table-container-wrapper {
        background-color: #1e293b !important;
        border-color: rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        
        ::ng-deep {
          .mat-mdc-table { background-color: #1e293b !important; }
          .mat-mdc-row {
            background-color: #1e293b !important;
            &:hover { background-color: rgba(255, 255, 255, 0.03) !important; }
          }
          .mat-mdc-cell {
            color: #ffffff !important;
            border-bottom-color: rgba(255, 255, 255, 0.05) !important;
          }
          .mat-mdc-header-cell {
            background-color: #1e293b !important;
            color: rgba(255, 255, 255, 0.5) !important;
            border-bottom-color: rgba(255, 255, 255, 0.1) !important;
          }
        }
      }

      .search-panel mat-form-field { 
          ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,0.05) !important; }
          ::ng-deep .mat-mdc-form-field-label { color: rgba(255,255,255,0.6) !important; }
          ::ng-deep .mat-mdc-input-element { color: white !important; }
      }

      .username-cell { color: #818cf8 !important; }
      .role-badge {
        background: rgba(255, 255, 255, 0.05) !important;
        color: rgba(255, 255, 255, 0.7) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }

      .user-paginator {
        background-color: #1e293b !important;
        color: #ffffff !important;
        border-top-color: rgba(255, 255, 255, 0.05) !important;
        ::ng-deep .mat-mdc-paginator-range-label,
        ::ng-deep .mat-mdc-select-value-text,
        ::ng-deep .mat-mdc-select-arrow svg { color: #ffffff !important; }
      }

      .audit-user { color: rgba(255, 255, 255, 0.8) !important; }
      .audit-date { color: rgba(255, 255, 255, 0.4) !important; }
    }
  `]
})
export class UserListComponent implements OnInit {
  displayedColumns: string[] = ['userName', 'email', 'companyName', 'roles', 'created', 'modified', 'status', 'actions'];
  dataSource = new MatTableDataSource<User>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Server-side State
  searchTerm = '';
  pageNumber = 1;
  pageSize = 10;
  totalCount = 0;
  sortColumn = 'userName';
  sortOrder = 'asc';
  
  private searchSubject = new Subject<string>();

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private roleService: RoleService,
    private loadingService: LoadingService
  ) { 
    // Setup Debounce Search
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.pageNumber = 1; // Reset to page 1
      this.loadUsers();
    });
  }

  summaryStats: SummaryStat[] = [];
  loading = true;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.loadingService.setLoading(true);

    const gridRequest = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      sortColumn: this.sortColumn,
      sortOrder: this.sortOrder
    };

    this.userService.getPaged(gridRequest).subscribe({
      next: (res) => {
        this.dataSource.data = res.items;
        this.totalCount = res.totalCount;

        this.summaryStats = [
          { label: 'Total Users', value: res.totalCount, icon: 'group', type: 'total' },
          { label: 'Active Users', value: res.activeCount, icon: 'how_to_reg', type: 'active' },
          { label: 'Inactive Users', value: res.inactiveCount, icon: 'info', type: 'warning' }
        ];

        this.loading = false;
        this.loadingService.setLoading(false);
      },
      error: () => {
        this.loading = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  onSearchChange(term: string) {
    this.loadingService.setLoading(true); // 🔥 Trigger loader immediately
    this.searchSubject.next(term);
  }

  onPageChange(event: PageEvent) {
    this.pageNumber = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onSortChange(sort: Sort) {
    this.sortColumn = sort.active;
    this.sortOrder = sort.direction || 'asc';
    this.pageNumber = 1; // Reset to page 1 when sorting changes
    this.loadUsers();
  }

  // --- CRUD Operations (Restored and updated to reload paged data) ---
  
  createUser() {
    const dialogRef = this.dialog.open(UserFormComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe(result => { if (result) this.loadUsers(); });
  }

  editUser(user: User) {
    const dialogRef = this.dialog.open(UserFormComponent, { width: '500px', data: user });
    dialogRef.afterClosed().subscribe(result => { if (result) this.loadUsers(); });
  }

  toggleStatus(user: User, isChecked: boolean) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: isChecked ? 'Activate User' : 'Deactivate User',
        message: `Are you sure?`,
        confirmText: isChecked ? 'Activate' : 'Deactivate',
      }
    });
    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.userService.updateStatus(user.id, isChecked).subscribe({
          next: () => { this.loadUsers(); }
        });
      } else { this.loadUsers(); }
    });
  }

  deleteUser(user: User) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Delete User', message: `Delete ${user.userName}?`, confirmText: 'Delete' }
    });
    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.userService.deleteUser(user.id).subscribe({
          next: () => { this.loadUsers(); }
        });
      }
    });
  }
}
