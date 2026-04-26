import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RoleService } from '../../../core/services/role.service';
import { Role, RolePrintSetting } from '../../../core/models/role.model';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { LoadingService } from '../../../core/services/loading.service';
import { AuthService } from '../../../core/services/auth.service';
import { PrintConfigService } from '../../../core/services/print-config.service';
import { CompanyService } from '../../company/services/company.service';
import { delay, finalize } from 'rxjs';

export interface ModuleGroup {
  name: string;
  icon: string;
  color: string;
  pages: string[];
}

@Component({
  selector: 'app-print-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './print-settings.html',
  styleUrls: ['./print-settings.scss']
})
export class PrintSettings implements OnInit {
  roles: any[] = [];
  selectedRoleId: any | null = null;
  settings: RolePrintSetting[] = [];
  loading = false;

  // New Hierarchical Selection
  companies: any[] = [];
  branches: any[] = [];
  selectedCompanyId: any = null;
  selectedBranchId: any = 'GLOBAL';
  isSuperAdmin = false;
  isLoadingBranches = false;

  readonly modules: ModuleGroup[] = [
    {
      name: 'Quick Inventory',
      icon: 'flash_on',
      color: '#f59e0b',
      pages: ['Quick Purchase Order', 'Quick Sale Order', 'Quick Purchase Return', 'Quick Sale Return']
    },
    {
      name: 'Standard Inventory',
      icon: 'inventory_2',
      color: '#3b82f6',
      pages: ['Purchase Order', 'Standard Sale Order', 'Purchase Return', 'Standard Sale Return']
    }
  ];

  readonly pages = this.modules.flatMap(m => m.pages);

  private roleService = inject(RoleService);
  private authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private loadingService = inject(LoadingService);
  private printConfigService = inject(PrintConfigService);

  ngOnInit() {
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.selectedCompanyId = this.authService.getCompanyId();
    
    if (this.isSuperAdmin) {
      this.loadCompanies();
    } else {
      this.loadBranches();
    }
  }

  loadCompanies() {
    this.companyService.getPaged({ pageNumber: 1, pageSize: 100 }).subscribe((res: any) => {
      this.companies = res.items || [];
      
      // If we already have a selected company (e.g. from auth), load its branches
      if (this.selectedCompanyId) {
        this.loadBranches();
      } else if (this.companies.length > 0) {
        // Otherwise auto-select the first company for Super Admin
        this.selectedCompanyId = this.companies[0].id || this.companies[0].Id;
        this.loadBranches();
      }
      this.cdr.detectChanges();
    });
  }

  onCompanyChange() {
    this.selectedBranchId = 'GLOBAL';
    this.roles = [];
    this.selectedRoleId = null;
    this.settings = [];
    this.loadBranches();
  }

  loadBranches() {
    if (!this.selectedCompanyId) return;

    this.isLoadingBranches = true;
    this.companyService.getBranchesByCompany(this.selectedCompanyId).pipe(
      delay(500)
    ).subscribe({
      next: (res: any) => {
        this.branches = res || [];
        this.isLoadingBranches = false;
        this.loadRoles();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingBranches = false;
        this.cdr.detectChanges();
      }
    });
  }

  onBranchChange() {
    this.loadRoles();
  }

  loadRoles() {
    if (!this.selectedCompanyId) return;
    
    this.loading = true;
    this.loadingService.setLoading(true);

    this.roleService.getByCompany(this.selectedCompanyId).subscribe({
      next: (roles: any[]) => {
        // Filter roles based on selected branch (or GLOBAL)
        this.roles = roles.filter(r => {
          const rBranchId = r.BranchId || r.branchId;
          // If branch is GLOBAL, show only global roles (branchId null)
          if (this.selectedBranchId === 'GLOBAL') return !rBranchId;
          // Otherwise show roles matching this branch
          return String(rBranchId) === String(this.selectedBranchId);
        });

        if (this.roles.length > 0) {
          this.selectedRoleId = (this.roles[0] as any).Id || this.roles[0].id;
          this.onRoleChange();
        } else {
          this.selectedRoleId = null;
          this.settings = [];
          this.loading = false;
          this.loadingService.setLoading(false);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error loading roles', err);
        this.loading = false;
        this.loadingService.setLoading(false);
        this.cdr.detectChanges();
      }
    });
  }

  getSelectedBranchName(): string {
    if (this.selectedBranchId === 'GLOBAL') return 'All Branches (Global)';
    const branch = this.branches.find(b => String(b.id || b.branchId) === String(this.selectedBranchId));
    return branch ? (branch.branchName || branch.name) : 'Select Branch';
  }

  onRoleChange() {
    if (this.selectedRoleId) {
      this.loading = true;
      this.loadingService.setLoading(true);

      const branchIdToFetch = this.selectedBranchId === 'GLOBAL' ? null : this.selectedBranchId;

      this.roleService.getRolePrintSettings(this.selectedRoleId, this.selectedCompanyId, branchIdToFetch).subscribe({
        next: (settings) => {
          this.settings = settings;

          this.pages.forEach(page => {
            const existing = this.settings.find(s => s.pageName === page);
            if (!existing) {
              this.settings.push({
                roleId: this.selectedRoleId!,
                companyId: this.selectedCompanyId,
                branchId: branchIdToFetch,
                pageName: page,
                printFormat: 'A4'
              });
            }
          });

          this.loading = false;
          this.loadingService.setLoading(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
          this.loadingService.setLoading(false);
          this.cdr.detectChanges();
        }
      });
    }
  }

  getSetting(pageName: string): RolePrintSetting {
    return this.settings.find(s => s.pageName === pageName) || { 
      roleId: this.selectedRoleId || 0, 
      pageName, 
      printFormat: 'A4',
      companyId: this.selectedCompanyId,
      branchId: this.selectedBranchId === 'GLOBAL' ? null : this.selectedBranchId
    };
  }

  setFormat(pageName: string, format: string) {
    const setting = this.settings.find(s => s.pageName === pageName);
    if (setting) {
      setting.printFormat = format;
    }
  }

  setAllInModule(module: ModuleGroup, format: string) {
    module.pages.forEach(page => {
      const setting = this.settings.find(s => s.pageName === page);
      if (setting) {
        setting.printFormat = format;
      }
    });
    this.cdr.detectChanges();
  }

  getPageLabel(page: string): string {
    return page.replace('Quick ', '').replace('Standard ', '');
  }

  saveSettings() {
    if (this.selectedRoleId) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Confirm Changes',
          message: 'Are you sure you want to save the print settings for this role?',
          confirmText: 'Yes, Save'
        }
      });

      dialogRef.afterClosed().subscribe(confirm => {
        if (confirm) {
          this.loading = true;
          this.loadingService.setLoading(true);

          const branchIdToSave = this.selectedBranchId === 'GLOBAL' ? null : this.selectedBranchId;

          // 🛡️ Robust Mapping: Ensure each setting has the current context and auditing info
          const currentUserId = this.authService.getUserId();
          const settingsToSave = this.settings.map(s => ({
            ...s,
            companyId: this.selectedCompanyId,
            branchId: branchIdToSave,
            roleId: this.selectedRoleId,
            lastModifiedBy: currentUserId?.toString()
          }));

          this.roleService.updateRolePrintSettings(this.selectedRoleId!, settingsToSave, this.selectedCompanyId, branchIdToSave).subscribe({
            next: () => {
              this.loading = false;
              this.loadingService.setLoading(false);
              this.cdr.detectChanges();
              this.printConfigService.clearCache();
              this.dialog.open(StatusDialogComponent, {
                width: '400px',
                data: { isSuccess: true, message: 'Print settings saved successfully!' },
                disableClose: true
              });
            },
            error: () => {
              this.loading = false;
              this.loadingService.setLoading(false);
              this.cdr.detectChanges();
              this.dialog.open(StatusDialogComponent, {
                width: '400px',
                data: { isSuccess: false, message: 'Failed to save print settings.' }
              });
            }
          });
        }
      });
    }
  }
}
