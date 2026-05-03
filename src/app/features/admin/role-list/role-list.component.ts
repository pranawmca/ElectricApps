import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { RoleService } from '../../../core/services/role.service';
import { Role } from '../../../core/models/role.model';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { RoleFormComponent } from './role-form.component';
import { Router } from '@angular/router';
import { SummaryStat, SummaryStatsComponent } from '../../../shared/components/summary-stats-component/summary-stats-component';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService } from '../../company/services/company.service';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, SummaryStatsComponent],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.scss']
})
export class RoleListComponent implements OnInit {
  dataSource = new MatTableDataSource<Role>([]);
  displayedColumns: string[] = ['name', 'company', 'branch', 'created', 'modified', 'type', 'actions'];
  loading = false;
  summaryStats: SummaryStat[] = [];
  branchesMap: Map<string, string> = new Map();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private roleService = inject(RoleService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);

  ngOnInit() {
    this.loadRoles();
    this.loadBranchNames();
  }

  loadBranchNames() {
    const companyId = this.authService.getCompanyId();
    if (companyId) {
      this.companyService.getBranchesByCompany(companyId).subscribe({
        next: (branches) => {
          branches.forEach(b => {
            const id = String(b.id || b.branchId);
            const name = b.name || b.branchName || b.city || 'Unnamed Branch';
            this.branchesMap.set(id, name);
          });
        },
        error: (err) => console.error('Failed to load branches for name resolution', err)
      });
    } else if (this.authService.getUserRole() === 'Default Admin') {
      this.companyService.getAllCompanies().subscribe({
        next: (companies) => {
          companies.forEach(company => {
            const addresses = company.addresses || company.Addresses || [];
            addresses.forEach((addr: any) => {
              const id = String(addr.id || addr.branchId);
              const name = addr.branchName || addr.name || addr.city || 'Unnamed Branch';
              this.branchesMap.set(id, name);
            });
          });
        },
        error: (err) => console.error('Failed to load companies for name resolution', err)
      });
    }
  }

  formatBranchNames(branchIdStr: string | null | undefined): string {
    if (!branchIdStr || String(branchIdStr).toUpperCase() === 'GLOBAL') return 'Global';
    
    const ids = String(branchIdStr).split(',');
    if (this.branchesMap.size > 0) {
      const names = ids.map(id => this.branchesMap.get(id.trim()) || id.trim());
      return names.join(', ');
    }
    
    return branchIdStr;
  }

  loadRoles() {
    this.loading = true;
    const companyId = this.authService.getCompanyId();
    const role = this.authService.getUserRole();
    
    // 🛡️ SECURITY: 
    // - Default Admin sees ALL roles across ALL tenants.
    // - Tenant Admins (Bipin) see ONLY their company's roles.
    const roles$ = (role === 'Default Admin') 
      ? this.roleService.getAllRoles() 
      : this.roleService.getByCompany(companyId);

    roles$.subscribe({
      next: (roles) => {
        this.dataSource.data = roles;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        
        // Calculate Stats
        const total = roles.length;
        const system = roles.filter(r => r.companyId === null).length;
        const custom = total - system;

        this.summaryStats = [
          { label: 'Total Roles', value: total, icon: 'admin_panel_settings', type: 'total' },
          { label: 'System Roles', value: system, icon: 'settings_suggest', type: 'info' },
          { label: 'Custom Roles', value: custom, icon: 'business', type: 'active' }
        ];

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openRoleForm(role?: Role) {
    const dialogRef = this.dialog.open(RoleFormComponent, {
      width: '450px',
      data: role
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRoles();
    });
  }

  deleteRole(role: Role) {
    if (!role.companyId) {
       this.dialog.open(StatusDialogComponent, {
         width: '400px',
         data: { isSuccess: false, message: 'System roles cannot be deleted.' }
       });
       return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Role',
        message: `Are you sure you want to delete the role "${role.roleName}"? This action cannot be undone.`,
        confirmText: 'Yes, Delete',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.roleService.deleteRole(role.id).subscribe({
          next: () => {
            this.showStatus(true, 'Role deleted successfully!');
            this.loadRoles();
          },
          error: (err) => this.showStatus(false, err.error?.message || 'Failed to delete role')
        });
      }
    });
  }

  managePermissions(role: Role) {
    this.router.navigate(['/app/admin/role-permissions'], { queryParams: { roleId: role.id } });
  }

  private showStatus(isSuccess: boolean, message: string) {
    this.dialog.open(StatusDialogComponent, {
      width: '400px',
      data: { isSuccess, message }
    });
  }
}
