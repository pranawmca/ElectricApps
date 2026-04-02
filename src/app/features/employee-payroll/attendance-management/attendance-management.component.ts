import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-attendance-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatInputModule, 
    MatSelectModule, 
    MatButtonToggleModule, 
    MatCardModule,
    MatFormFieldModule
  ],
  templateUrl: './attendance-management.component.html',
  styleUrl: './attendance-management.component.scss'
})
export class AttendanceManagementComponent implements OnInit {
  private permissionService = inject(PermissionService);
  
  canAdd = false;
  canEdit = false;
  
  attendanceMethod: 'Manual' | 'Biometric' = 'Manual';
  currentDate = new Date();
  
  attendanceLogs = [
    { name: 'John Doe', code: 'EMP001', checkIn: '09:05 AM', checkOut: '06:15 PM', status: 'Present', method: 'Biometric' },
    { name: 'Sarah Smith', code: 'EMP002', checkIn: '08:55 AM', checkOut: '05:30 PM', status: 'Late', method: 'Manual' },
    { name: 'Michael Ross', code: 'EMP003', checkIn: '-', checkOut: '-', status: 'Absent', method: '-' }
  ];

  dataSource = new MatTableDataSource<any>(this.attendanceLogs);
  displayedColumns: string[] = ['name', 'code', 'checkIn', 'checkOut', 'status', 'method', 'actions'];

  ngOnInit(): void {
    this.canAdd = this.permissionService.hasPermission('CanAdd');
    this.canEdit = this.permissionService.hasPermission('CanEdit');
  }

  setMethod(method: 'Manual' | 'Biometric') {
    this.attendanceMethod = method;
  }
}
