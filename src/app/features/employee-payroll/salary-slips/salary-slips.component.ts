import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-salary-slips',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './salary-slips.component.html',
  styleUrl: './salary-slips.component.scss'
})
export class SalarySlipsComponent implements OnInit {
  private permissionService = inject(PermissionService);

  canProcess = false;
  canDownload = false;
  selectedMonth = 'March';
  selectedYear = '2026';
  
  slips = [
    { name: 'John Doe', code: 'EMP001', basic: 50000, hra: 20000, gross: 75000, net: 68000, status: 'Paid' },
    { name: 'Sarah Smith', code: 'EMP002', basic: 45000, hra: 18000, gross: 68000, net: 62000, status: 'Paid' },
    { name: 'Michael Ross', code: 'EMP003', basic: 40000, hra: 16000, gross: 60000, net: 55000, status: 'Pending' }
  ];

  dataSource = new MatTableDataSource<any>(this.slips);
  displayedColumns: string[] = ['employee', 'code', 'breakdown', 'totals', 'status', 'actions'];

  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  years = ['2024', '2025', '2026'];

  ngOnInit(): void {
    this.canProcess = this.permissionService.hasPermission('CanAdd');
    this.canDownload = this.permissionService.hasPermission('CanView');
  }
}
