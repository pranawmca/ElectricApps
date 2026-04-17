import { Routes } from '@angular/router';
import { PermissionGuard } from '../core/gaurds/permission.guard';

export const ADMIN_ROUTES: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        data: { breadcrumb: 'Dashboard' }
    },
    {
        path: 'roles',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/role-list/role-list.component').then(m => m.RoleListComponent),
        data: { breadcrumb: 'Roles' }
    },
    {
        path: 'role-permissions',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/role-permissions/role-permissions.component').then(m => m.RolePermissionsComponent),
        data: { breadcrumb: 'Role Permissions' }
    },
    {
        path: 'users',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/user-list/user-list.component').then(m => m.UserListComponent),
        data: { breadcrumb: 'Users' }
    },
    {
        path: 'menus',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/menu-management/menu-management.component').then(m => m.MenuManagementComponent),
        data: { breadcrumb: 'Menus' }
    },
    {
        path: 'print-settings',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/print-settings/print-settings').then(m => m.PrintSettings),
        data: { breadcrumb: 'Print Settings' }
    },
    {
        path: 'system-logs',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/system-logs/system-logs.component').then(m => m.SystemLogsComponent),
        data: { breadcrumb: 'System Activity Logs' }
    },
    {
        path: 'companies',
        canActivate: [PermissionGuard],
        data: { breadcrumb: 'Company Management' },
        children: [
            {
                path: '',
                loadComponent: () => import('../features/company/company-list/company-list').then(m => m.CompanyList),
                data: { breadcrumb: 'List' }
            },
            {
                path: 'add',
                loadComponent: () => import('../features/company/company-form/company-form').then(m => m.CompanyForm),
                data: { breadcrumb: 'Add Profile' }
            },
            {
                path: 'edit/:id',
                loadComponent: () => import('../features/company/company-form/company-form').then(m => m.CompanyForm),
                data: { breadcrumb: 'Update Profile' }
            },
            {
                path: 'bulk-add',
                loadComponent: () => import('../features/company/bulk-company-form/bulk-company-form').then(m => m.BulkCompanyForm),
                data: { breadcrumb: 'Bulk Onboard' }
            },
            {
                path: 'onboard',
                loadComponent: () => import('../features/admin/onboard-customer/onboard-customer.component').then(m => m.OnboardCustomerComponent),
                data: { breadcrumb: 'Onboard New Customer' }
            }
        ]
    },
    {
        path: 'subscriptions',
        canActivate: [PermissionGuard],
        loadComponent: () => import('../features/admin/license-management/license-management.component').then(m => m.LicenseManagementComponent),
        data: { breadcrumb: 'License & Subscriptions' }
    }
];
