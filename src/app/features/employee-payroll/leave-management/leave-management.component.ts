import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PermissionService } from '../../../core/services/permission.service';
import { LeaveApplicationDialogComponent } from './leave-application-dialog.component';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatCardModule, 
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './leave-management.component.html',
  styleUrl: './leave-management.component.scss'
})
export class LeaveManagementComponent implements OnInit {
  private permissionService = inject(PermissionService);
  private dialog = inject(MatDialog);

  canAdd = false;
  canApprove = false;
  leaves = [
    { employee: 'John Doe', type: 'Sick Leave', from: '2026-04-10', to: '2026-04-11', reason: 'Flu symptoms', status: 'Pending' },
    { employee: 'Sarah Smith', type: 'Annual Leave', from: '2026-04-15', to: '2026-04-20', reason: 'Family vacation', status: 'Approved' },
    { employee: 'Michael Ross', type: 'Casual Leave', from: '2026-04-01', to: '2026-04-01', reason: 'Personal work', status: 'Rejected' }
  ];

  dataSource = new MatTableDataSource<any>(this.leaves);
  displayedColumns: string[] = ['employee', 'type', 'dates', 'reason', 'status', 'actions'];

  ngOnInit(): void {
    this.canAdd = this.permissionService.hasPermission('CanAdd');
    this.canApprove = this.permissionService.hasPermission('CanEdit');
  }

  openApplyDialog(): void {
    const dialogRef = this.dialog.open(LeaveApplicationDialogComponent, {
      width: '600px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('New Leave Request:', result);
      }
    });
  }
}
