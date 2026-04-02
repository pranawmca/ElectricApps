import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { PermissionService } from '../../../core/services/permission.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatMenuModule,
    MatPaginatorModule, 
    MatSortModule,
    RouterLink
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss'
})
export class EmployeeListComponent implements OnInit {
  private permissionService = inject(PermissionService);

  canAdd = false;
  canEdit = false;
  canDelete = false;

  employees = [
    { id: '1', code: 'EMP001', name: 'John Doe', designation: 'Senior Developer', department: 'IT', email: 'john@example.com', status: 'Active', pic: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', code: 'EMP002', name: 'Sarah Smith', designation: 'HR Manager', department: 'HR', email: 'sarah@example.com', status: 'Active', pic: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', code: 'EMP003', name: 'Michael Ross', designation: 'Accountant', department: 'Finance', email: 'michael@example.com', status: 'Inactive', pic: 'https://i.pravatar.cc/150?u=3' },
    { id: '4', code: 'EMP004', name: 'Emma Watson', designation: 'Sales Representative', department: 'Sales', email: 'emma@example.com', status: 'Active', pic: 'https://i.pravatar.cc/150?u=4' },
    { id: '5', code: 'EMP005', name: 'Harvey Specter', designation: 'Senior Consultant', department: 'Operations', email: 'harvey@example.com', status: 'Active', pic: 'https://i.pravatar.cc/150?u=5' }
  ];

  dataSource = new MatTableDataSource<any>(this.employees);
  displayedColumns: string[] = ['name', 'code', 'designation', 'department', 'email', 'status', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  searchTerm = '';
  selectedDept = 'All';
  departments = ['All', 'IT', 'HR', 'Finance', 'Operations', 'Sales'];

  ngOnInit(): void {
    // Load Permissions
    this.canAdd = this.permissionService.hasPermission('CanAdd');
    this.canEdit = this.permissionService.hasPermission('CanEdit');
    this.canDelete = this.permissionService.hasPermission('CanDelete');

    // Custom filter predicate for Department + Search
    this.dataSource.filterPredicate = (data, filter) => {
        const searchTerms = JSON.parse(filter);
        const nameMatch = data.name.toLowerCase().includes(searchTerms.searchTerm.toLowerCase()) || data.code.toLowerCase().includes(searchTerms.searchTerm.toLowerCase());
        const deptMatch = searchTerms.selectedDept === 'All' || data.department === searchTerms.selectedDept;
        return nameMatch && deptMatch;
    };
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter() {
    const filterValue = {
        searchTerm: this.searchTerm,
        selectedDept: this.selectedDept
    };
    this.dataSource.filter = JSON.stringify(filterValue);
  }
}
