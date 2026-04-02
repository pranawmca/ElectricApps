import { Routes } from '@angular/router';
import { PermissionGuard } from '../core/gaurds/permission.guard';

export const EMPLOYEE_PAYROLL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [PermissionGuard],
    data: { breadcrumb: 'Dashboard' },
    loadComponent: () =>
      import('../features/employee-payroll/employee-payroll-dashboard/employee-payroll-dashboard.component')
        .then(m => m.EmployeePayrollDashboardComponent)
  },
  {
    path: 'employees',
    canActivate: [PermissionGuard],
    data: { breadcrumb: 'Employee Directory' },
    children: [
      {
        path: '',
        data: { breadcrumb: 'List' },
        loadComponent: () =>
          import('../features/employee-payroll/employee-list/employee-list.component')
            .then(m => m.EmployeeListComponent)
      },
      {
        path: 'add',
        canActivate: [PermissionGuard],
        data: { breadcrumb: 'Add Employee' },
        loadComponent: () =>
          import('../features/employee-payroll/employee-form/employee-form.component')
            .then(m => m.EmployeeFormComponent)
      },
      {
        path: 'edit/:id',
        canActivate: [PermissionGuard],
        data: { breadcrumb: 'Edit Employee' },
        loadComponent: () =>
          import('../features/employee-payroll/employee-form/employee-form.component')
            .then(m => m.EmployeeFormComponent)
      }
    ]
  },
  {
    path: 'attendance',
    canActivate: [PermissionGuard],
    data: { breadcrumb: 'Attendance' },
    loadComponent: () =>
      import('../features/employee-payroll/attendance-management/attendance-management.component')
        .then(m => m.AttendanceManagementComponent)
  },
  {
    path: 'leaves',
    canActivate: [PermissionGuard],
    data: { breadcrumb: 'Leaves' },
    loadComponent: () =>
      import('../features/employee-payroll/leave-management/leave-management.component')
        .then(m => m.LeaveManagementComponent)
  },
  {
    path: 'salary-slips',
    canActivate: [PermissionGuard],
    data: { breadcrumb: 'Salary Management' },
    children: [
      {
        path: '',
        data: { breadcrumb: 'Monthly Slips' },
        loadComponent: () =>
          import('../features/employee-payroll/salary-slips/salary-slips.component')
            .then(m => m.SalarySlipsComponent)
      }
    ]
  }
];
