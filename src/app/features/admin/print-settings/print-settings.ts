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
import { delay, finalize, forkJoin, of } from 'rxjs';

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

  // Hierarchical Selection with Multiple Branches
  companies: any[] = [];
  branches: any[] = [];
  selectedCompanyId: any = null;
  selectedBranchIds: string[] = [];
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
    this.selectedBranchIds = [];
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
        
        // Auto-select first branch of multi-tenant company by default
        if (this.branches.length > 0) {
          const firstBranchId = this.branches[0].id || this.branches[0].branchId;
          this.selectedBranchIds = [firstBranchId];
        } else {
          this.selectedBranchIds = [];
        }

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
    // Reload settings for the current selected role based on the newly selected branch(es)
    this.onRoleChange();
  }

  loadRoles() {
    if (!this.selectedCompanyId) return;
    
    this.loading = true;
    this.loadingService.setLoading(true);

    this.roleService.getByCompany(this.selectedCompanyId).subscribe({
      next: (roles: any[]) => {
        // 🛡️ Bind ALL tenant roles except Super Admin & Default Admin
        this.roles = roles.filter(r => {
          const name = r.RoleName || r.roleName || '';
          return name !== 'Super Admin' && name !== 'Default Admin';
        });

        if (this.roles.length > 0) {
          // Keep selection if previously selected, otherwise default to first
          const exists = this.roles.some(r => (r.Id || r.id) === this.selectedRoleId);
          if (!exists) {
            this.selectedRoleId = (this.roles[0] as any).Id || this.roles[0].id;
          }
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
    if (!this.selectedBranchIds || this.selectedBranchIds.length === 0) {
      return 'Select Branch';
    }
    const selectedNames = this.branches
      .filter(b => this.selectedBranchIds.includes(b.id || b.branchId))
      .map(b => b.branchName || b.name);
    
    return selectedNames.join(', ');
  }

  onRoleChange() {
    if (this.selectedRoleId) {
      this.loading = true;
      this.loadingService.setLoading(true);

      // Fetch print settings of the first selected branch to display in the UI
      const branchIdToFetch = this.selectedBranchIds.length > 0 ? this.selectedBranchIds[0] : null;

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
      branchId: this.selectedBranchIds.length > 0 ? this.selectedBranchIds[0] : null
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
    if (this.selectedRoleId && this.selectedBranchIds.length > 0) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Confirm Changes',
          message: `Are you sure you want to save the print settings for this role across the ${this.selectedBranchIds.length} selected branches?`,
          confirmText: 'Yes, Save'
        }
      });

      dialogRef.afterClosed().subscribe(confirm => {
        if (confirm) {
          this.loading = true;
          this.loadingService.setLoading(true);

          const currentUserId = this.authService.getUserId();

          // Save settings concurrently for each selected branch
          const saveObservables = this.selectedBranchIds.map(branchId => {
            const isLoadedBranch = branchId === (this.selectedBranchIds.length > 0 ? this.selectedBranchIds[0] : null);

            const settingsToSave = this.settings.map(s => {
              const clone = {
                ...s,
                companyId: this.selectedCompanyId,
                branchId: branchId,
                roleId: this.selectedRoleId,
                lastModifiedBy: currentUserId?.toString()
              };

              // If we are cloning/saving to a different branch than the one loaded, 
              // remove the original primary key to prevent duplicate key constraint violations in SQL.
              if (!isLoadedBranch) {
                delete (clone as any).id;
                delete (clone as any).Id;
              }

              return clone;
            });

            return this.roleService.updateRolePrintSettings(this.selectedRoleId!, settingsToSave, this.selectedCompanyId, branchId);
          });

          forkJoin(saveObservables).subscribe({
            next: () => {
              this.loading = false;
              this.loadingService.setLoading(false);
              this.cdr.detectChanges();
              this.printConfigService.clearCache();
              this.dialog.open(StatusDialogComponent, {
                width: '400px',
                data: { isSuccess: true, message: 'Print settings saved successfully for all selected branches!' },
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
