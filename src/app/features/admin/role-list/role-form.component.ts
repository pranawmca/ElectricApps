import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RoleService } from '../../../core/services/role.service';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { MatDialog } from '@angular/material/dialog';
import { CompanyService } from '../../company/services/company.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>{{ isEdit ? 'Edit Role' : 'Create New Role' }}</h2>
      <button mat-icon-button mat-dialog-close class="close-btn">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    
    <mat-dialog-content>
      <form [formGroup]="roleForm" class="role-form">
        <mat-form-field appearance="outline" *ngIf="isSuperAdmin">
          <mat-label>Assign Company</mat-label>
          <mat-select formControlName="CompanyId">
            <mat-option [value]="''">Master (System Role)</mat-option>
            <mat-option *ngFor="let company of companies" [value]="company.id">{{company.name || company.Name}}</mat-option>
          </mat-select>
          <mat-icon matPrefix>business</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="isEdit || branches.length > 0">
          <mat-label>Assign Branch</mat-label>
          <mat-select formControlName="BranchId">
            <mat-select-trigger>
              <div style="display: flex; align-items: center; gap: 8px;">
                <mat-spinner diameter="18" *ngIf="isLoadingBranches"></mat-spinner>
                <mat-icon *ngIf="!isLoadingBranches" style="vertical-align: middle;">{{ roleForm.get('BranchId')?.value === 'GLOBAL' ? 'public' : 'location_on' }}</mat-icon>
                <span>{{ isLoadingBranches ? 'Loading branches...' : getSelectedBranchName() }}</span>
              </div>
            </mat-select-trigger>
            <mat-option value="GLOBAL">
              <mat-icon>public</mat-icon> All Branches (Global)
            </mat-option>
            <mat-option *ngFor="let branch of branches" [value]="branch.id">
              <mat-icon>store</mat-icon> {{branch.branchName || branch.name || 'Main Branch'}}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix *ngIf="!isLoadingBranches && !roleForm.get('BranchId')?.value">location_on</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="RoleName" placeholder="e.g. Sales Manager">
          <mat-icon matPrefix>admin_panel_settings</mat-icon>
          <mat-error *ngIf="roleForm.get('RoleName')?.hasError('required')">Role name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="Description" placeholder="Explain what this role does..." rows="3"></textarea>
          <mat-icon matPrefix>description</mat-icon>
        </mat-form-field>

        <div class="duplicate-warning" *ngIf="isDuplicateRole">
          <mat-icon>warning</mat-icon>
          <span>Role "{{roleForm.get('RoleName')?.value}}" already exists for this scope.</span>
        </div>
      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-raised-button mat-dialog-close class="cancel-btn">CANCEL</button>
      <button mat-raised-button class="main-add-btn" 
              [disabled]="roleForm.invalid || isDuplicateRole || checkingDuplicate" 
              (click)="save()">
        <mat-spinner diameter="20" *ngIf="checkingDuplicate" style="margin-right: 8px;"></mat-spinner>
        {{ isEdit ? 'UPDATE ROLE' : 'CREATE ROLE' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      h2 { margin: 0; font-weight: 700; color: #1e293b; font-size: 20px; }
      .close-btn { color: #ef4444 !important; }
    }
    mat-dialog-content { padding: 20px !important; }
    .role-form { display: flex; flex-direction: column; gap: 8px; }
    mat-form-field { width: 100%; }
    mat-dialog-actions { padding: 16px 20px !important; border-top: 1px solid #f1f5f9; gap: 12px; }
    
    .cancel-btn { color: #64748b !important; font-weight: 600 !important; }
    .main-add-btn {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
      color: white !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
    }

    .duplicate-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      background: #fff1f2;
      color: #e11d48;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #fecdd3;
      margin-top: 8px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    :host-context(.dark-mode) {
      .dialog-header { background: #1e293b; border-bottom-color: rgba(255,255,255,0.1); h2 { color: white; } }
      mat-dialog-content { background: #1e293b; }
      mat-dialog-actions { background: #1e293b; border-top-color: rgba(255,255,255,0.1); }
    }
  `]
})
export class RoleFormComponent implements OnInit {
  roleForm: FormGroup;
  isEdit = false;
  isSuperAdmin = false;
  companies: any[] = [];
  branches: any[] = [];
  isLoadingBranches = false;
  isDuplicateRole = false; // 🔥 To track duplicates
  checkingDuplicate = false;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private companyService: CompanyService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<RoleFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog
  ) {
    this.isEdit = !!data;
    
    // Auth Check
    const role = this.authService.getUserRole();
    this.isSuperAdmin = role === 'Default Admin' || role === 'Super Admin' || role === 'Admin' && !this.authService.getCompanyId();

    this.roleForm = this.fb.group({
      RoleName: ['', Validators.required],
      Description: [''],
      CompanyId: [''],
      BranchId: ['GLOBAL']
    });

    this.roleForm.get('CompanyId')?.valueChanges.subscribe(cid => {
      this.loadBranches(cid);
      
      // 🛡️ SECURITY: If a tenant company is selected, force RoleName to "Super Admin"
      if (cid) {
        this.roleForm.get('RoleName')?.setValue('Super Admin');
        this.roleForm.get('RoleName')?.disable();
        this.checkDuplicateRole(cid, 'Super Admin');
      } else {
        this.isDuplicateRole = false;
        // Unlock if switched back to Master (only for new roles)
        if (!this.isEdit) {
          this.roleForm.get('RoleName')?.enable();
          // Trigger check for current name if any
          this.checkDuplicateRole('', this.roleForm.get('RoleName')?.value);
        }
      }
    });

    // 🔄 WATCH ROLE NAME FOR MASTER DUPLICATES
    this.roleForm.get('RoleName')?.valueChanges.subscribe(name => {
      const cid = this.roleForm.get('CompanyId')?.value;
      if (!cid && name) {
        this.checkDuplicateRole('', name);
      }
    });
  }

  getSelectedBranchName(): string {
    const branchId = this.roleForm.get('BranchId')?.value;
    if (branchId === 'GLOBAL') return 'All Branches (Global)';
    const branch = this.branches.find(b => b.id === branchId);
    return branch ? (branch.branchName || branch.name) : 'All Branches (Global)';
  }

  checkDuplicateRole(companyId: string, roleName: string) {
    if (this.isEdit || !roleName) {
      this.isDuplicateRole = false;
      return;
    }

    this.checkingDuplicate = true;
    const cid = companyId === '' ? null : companyId; // Map UI empty string to null for API
    this.roleService.getByCompany(cid).subscribe({
      next: (roles) => {
        this.isDuplicateRole = roles.some(r => r.roleName.toLowerCase() === roleName.trim().toLowerCase());
        this.checkingDuplicate = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.checkingDuplicate = false;
      }
    });
  }

  loadBranches(companyId: string | null) {
    if (!companyId) {
      this.branches = [];
      return;
    }

    this.isLoadingBranches = true;
    this.companyService.getBranchesByCompany(companyId).subscribe({
      next: (branches: any[]) => {
        // Normalize IDs to string for reliable matching
        this.branches = branches.map(b => ({
          ...b,
          id: String(b.id || b.branchId)
        }));

        this.isLoadingBranches = false;

        // CRITICAL: Re-patch the branch ID after the list is loaded so mat-select can find the match
        if (this.isEdit && this.data) {
          const bId = this.data.BranchId || this.data.branchId || 'GLOBAL';
          this.roleForm.patchValue({ BranchId: String(bId) }, { emitEvent: false });
          this.cdr.detectChanges(); // Force UI to show selected value
        }
      },
      error: () => {
        this.isLoadingBranches = false;
        this.branches = [];
      }
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin) {
      this.companyService.getPaged({ pageNumber: 1, pageSize: 100 }).subscribe((res: any) => {
        this.companies = res.items || [];
      });
    }

    if (this.isEdit) {
      this.roleForm.get('CompanyId')?.disable();
    }

    if (this.isEdit && this.data) {
      const companyId = this.data.CompanyId || this.data.companyId || null;
      const branchId = this.data.BranchId || this.data.branchId || 'GLOBAL';
      const roleName = this.data.RoleName || this.data.roleName || '';

      this.roleForm.patchValue({
        RoleName: roleName,
        Description: this.data.description || this.data.Description || '',
        CompanyId: companyId,
        BranchId: branchId ? String(branchId) : 'GLOBAL'
      }, { emitEvent: false });

      // 🛡️ SECURITY: Disable RoleName if it's a core role
      const isCoreRole = roleName === 'Super Admin' || roleName === 'Default Admin';
      if (isCoreRole) {
        this.roleForm.get('RoleName')?.disable();
      }

      if (companyId) {
        this.loadBranches(companyId);
      }
    }
  }

  save() {
    if (this.roleForm.valid || (this.roleForm.get('RoleName')?.disabled && this.roleForm.get('RoleName')?.value)) {
      const { RoleName, Description, CompanyId, BranchId } = this.roleForm.getRawValue(); // 🔥 Use getRawValue to get disabled field values
      const branchToSave = (BranchId === 'GLOBAL') ? null : BranchId;
      const companyToSave = (CompanyId === '') ? null : CompanyId; // Map empty string back to null for API

      if (this.isEdit) {
        this.roleService.updateRole(this.data.id, RoleName, branchToSave, Description).subscribe({
          next: () => {
            this.showStatus(true, 'Role updated successfully!');
            this.dialogRef.close(true);
          },
          error: (err) => this.showStatus(false, err.error?.message || 'Failed to update role')
        });
      } else {
        this.roleService.createRole(RoleName, companyToSave, branchToSave, Description).subscribe({
          next: () => {
            this.showStatus(true, 'Role created successfully!');
            this.dialogRef.close(true);
          },
          error: (err) => this.showStatus(false, err.error?.message || 'Failed to create role')
        });
      }
    }
  }

  private showStatus(isSuccess: boolean, message: string) {
    this.dialog.open(StatusDialogComponent, {
      width: '400px',
      data: { isSuccess, message }
    });
  }
}
