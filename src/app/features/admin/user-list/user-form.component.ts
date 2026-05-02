import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RegisterUserDto } from '../../../core/models/user.model';
import { RoleService } from '../../../core/services/role.service';
import { UserService } from '../../../core/services/user.service';
import { Role } from '../../../core/models/role.model';
import { CompanyService } from '../../company/services/company.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../shared/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="dialog-header custom-header">
      <h2 mat-dialog-title>{{ isEdit ? 'Edit User' : 'Create New User' }}</h2>
      <button mat-icon-button mat-dialog-close class="close-btn">
        <mat-icon>close</mat-icon>
      </button>
    </div>
    
    <mat-dialog-content>
      <form [formGroup]="userForm" class="user-form">
        
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="UserName" placeholder="pappu_singh">
          <mat-icon matPrefix>person_outline</mat-icon>
          <mat-error *ngIf="userForm.get('UserName')?.hasError('required')">Username is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="Email" placeholder="admin@admin.com">
          <mat-icon matPrefix>mail_outline</mat-icon>
          <mat-error *ngIf="userForm.get('Email')?.hasError('required')">Email is required</mat-error>
          <mat-error *ngIf="userForm.get('Email')?.hasError('email')">Invalid email</mat-error>
        </mat-form-field>

        <div class="duplicate-warning" *ngIf="isDuplicateEmail">
          <mat-icon>warning</mat-icon>
          <span>Email ID already exists in the system. Please use a unique email.</span>
        </div>

        <div class="duplicate-warning" *ngIf="isDuplicateEmail">
          <mat-icon>warning</mat-icon>
          <span>Email ID already exists in the system. Please use a unique email.</span>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Password{{ isEdit ? ' (Read Only)' : '*' }}</mat-label>
          <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="Password" [readonly]="isEdit">
          <mat-icon matPrefix>lock</mat-icon>
          <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" [attr.aria-label]="'Hide password'" [attr.aria-pressed]="hidePassword" type="button">
            <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
          <mat-error *ngIf="userForm.get('Password')?.hasError('required')">Password is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="isSuperAdmin || loggedInCompanyId">
          <mat-label>Assign Company</mat-label>
          <mat-select formControlName="CompanyId">
            <mat-option [value]="null" *ngIf="isSuperAdmin && !loggedInCompanyId">Master (System Admin)</mat-option>
            <mat-option *ngFor="let company of companies" [value]="company.id">
              {{company.name || company.Name}}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>business</mat-icon>
          <mat-hint *ngIf="!isSuperAdmin && loggedInCompanyId">You can only create users for your assigned company</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Roles (Multi-Select)</mat-label>
          <mat-select formControlName="RoleIds" multiple [placeholder]="isLoadingRoles ? 'Loading roles...' : 'Select Roles'">
            <mat-option *ngIf="isLoadingRoles" disabled>
               <div class="loading-item">
                 <mat-spinner diameter="20"></mat-spinner>
                 <span>Fetching roles...</span>
               </div>
            </mat-option>
            <mat-option *ngFor="let role of roles" [value]="role.id">{{role.roleName}}</mat-option>
          </mat-select>
          <mat-icon matPrefix>admin_panel_settings</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="branches.length > 0">
          <mat-label>Assign Branch</mat-label>
          <mat-select formControlName="BranchId" multiple>
            <mat-option value="GLOBAL">
              <mat-icon>public</mat-icon> All Branches (Global)
            </mat-option>
            <mat-option *ngFor="let branch of branches" [value]="branch.id">
              {{branch.branchName || 'Main Branch'}}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>location_on</mat-icon>
          <mat-hint *ngIf="isLoadingBranches">
             <mat-spinner diameter="15"></mat-spinner> Loading branches...
          </mat-hint>
        </mat-form-field>

        <div class="duplicate-warning" *ngIf="isDuplicateSuperAdmin">
          <mat-icon>warning</mat-icon>
          <span>A Super Admin already exists for this company. Only one Super Admin is allowed per tenant.</span>
        </div>

      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-raised-button mat-dialog-close class="cancel-btn">CANCEL</button>
      <button mat-raised-button class="main-add-btn" 
              [disabled]="userForm.invalid || isDuplicateSuperAdmin || checkingSuperAdmin || isDuplicateEmail || checkingEmail" 
              (click)="save()">
        <mat-spinner diameter="20" *ngIf="checkingSuperAdmin || checkingEmail" style="margin-right: 8px;"></mat-spinner>
        {{ isEdit ? 'UPDATE USER' : 'CREATE USER' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: var(--dg-primary-theme, linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%));
      
      h2 { margin: 0; font-weight: 700; color: white !important; font-size: 18px; }
      
      .close-btn { 
        color: white !important; 
        background: rgba(255,255,255,0.1) !important;
        border-radius: 50% !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.12) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 0 !important;
        min-width: 32px !important;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin: 0 !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        &:hover {
          background: #fee2e2 !important;
          transform: rotate(90deg) scale(1.1);
        }
      }
    }

    mat-dialog-content {
      padding: 12px 20px 0 20px !important;
      max-height: 70vh;
    }

    .user-form { 
      display: flex; 
      flex-direction: column; 
      gap: 4px; 
      padding-top: 10px;
    }

    .loading-item {
       display: flex;
       align-items: center;
       gap: 12px;
       padding: 8px;
       color: #64748b;
    }

    mat-form-field { width: 100%; }
    
    ::ng-deep .mat-mdc-dialog-container { 
      border-radius: 20px !important; 
      overflow: hidden !important;
    }
    
    mat-dialog-actions {
      padding: 16px 20px !important;
      border-top: 1px solid #f1f5f9;
      gap: 12px;
      background: #fafafa;
    }

    .cancel-btn {
      color: #64748b !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      padding: 0 20px !important;
      height: 40px !important;
      border-radius: 12px !important;
      text-transform: uppercase;
      font-size: 13px;
    }

    .main-add-btn {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
      color: white !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
      border-radius: 12px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      height: 40px !important;
      padding: 0 28px !important;
      transition: all 0.3s ease !important;
      border: none;
      text-transform: uppercase;
      font-size: 13px;

      &:hover:not([disabled]) {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4) !important;
      }

      &[disabled] {
        background: #e2e8f0 !important;
        color: #94a3b8 !important;
        box-shadow: none !important;
      }
    }

    /* Responsive */
    @media (max-width: 600px) {
      ::ng-deep .mat-mdc-dialog-container {
        width: 100vw !important;
        max-width: none !important;
        border-radius: 0 !important;
        height: auto !important; /* Fix: Let it be sized by content */
      }
      mat-dialog-content {
        padding-bottom: 20px !important; /* Ensure some space before buttons */
      }
      mat-dialog-actions {
        padding-bottom: 24px !important;
      }
    }

    /* ==========================================================================
       USER FORM DIALOG DARK MODE POLISH
       ========================================================================== */
    :host-context(.dark-mode) {
      .dialog-header {
        background-color: #1e293b !important;
        border-bottom-color: rgba(255, 255, 255, 0.05) !important;
        h2 { color: #ffffff !important; }
        
        .close-btn {
          background: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.6) !important;
          &:hover { background: rgba(255, 255, 255, 0.1) !important; color: #ffffff !important; }
        }
      }

      mat-dialog-content {
        background-color: #1e293b !important;
      }

      ::ng-deep {
        .mat-mdc-form-field-wrapper {
          background-color: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
        }
        .mat-mdc-form-field {
          .mat-mdc-floating-label { color: rgba(255, 255, 255, 0.6) !important; }
          .mat-mdc-input-element { color: #ffffff !important; }
          mat-icon { color: rgba(255, 255, 255, 0.5) !important; }
          .mat-mdc-select-value-text { color: #ffffff !important; }
          .mat-mdc-select-arrow svg { fill: #ffffff !important; }
        }
      }

      mat-dialog-actions {
        background-color: #1e293b !important;
        border-top-color: rgba(255, 255, 255, 0.05) !important;
        .cancel-btn { color: rgba(255, 255, 255, 0.5) !important; }
      }
    }
    .duplicate-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      background: #fff1f2;
      color: #e11d48;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid #fecdd3;
      margin-top: 8px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
  `]
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  roles: Role[] = [];
  companies: any[] = [];
  branches: any[] = [];
  hidePassword = true;
  isEdit = false;
  isSuperAdmin = false;
  loggedInCompanyId: string | null = null;
  isLoadingRoles = false;
  isLoadingBranches = false;
  isDuplicateSuperAdmin = false;
  checkingSuperAdmin = false;
  isDuplicateEmail = false;
  checkingEmail = false;

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private userService: UserService,
    private companyService: CompanyService,
    private authService: AuthService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<UserFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private notificationService: NotificationService
  ) {
    this.isEdit = !!data;
    
    // Check if current user is System-level Root Admin
    const role = this.authService.getUserRole();
    this.loggedInCompanyId = this.authService.getCompanyId();
    
    // 🔥 FINAL FIX: Default Admin is ALWAYS a Global Super Admin.
    // Super Admin role is only global if no companyId is bound.
    this.isSuperAdmin = (role === 'Default Admin') || (role === 'Super Admin' && !this.loggedInCompanyId);

    this.userForm = this.fb.group({
      UserName: [{ value: '', disabled: false }, Validators.required],
      Email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
      Password: ['', this.isEdit ? [] : [Validators.required]],
      RoleIds: [[]],
      CompanyId: [{ value: this.loggedInCompanyId || null, disabled: !this.isSuperAdmin }], // Default to active company context
      BranchId: [this.isEdit ? [] : (this.authService.getBranchId() ? this.authService.getBranchId()!.split(',').map(b => !isNaN(Number(b.trim())) ? Number(b.trim()) : b.trim()) : [])] // 🔥 FIX: Ensure numeric array for matching dropdown
    });

    // 🔄 REFRESH ROLES & BRANCHES WHEN COMPANY CHANGES
    this.userForm.get('CompanyId')?.valueChanges.subscribe(cid => {
      this.loadRoles(cid);
      this.loadBranches(cid);
      this.checkSuperAdminDuplicate();
    });

    // 🔄 WATCH EMAIL FOR DUPLICATES
    this.userForm.get('Email')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(email => {
      this.checkEmailDuplicate(email);
    });

    // 🔄 WATCH ROLE SELECTION FOR SUPER ADMIN
    this.userForm.get('RoleIds')?.valueChanges.subscribe(() => {
      this.checkSuperAdminDuplicate();
    });

    // Initial Load
    const initialCid = this.isEdit ? (this.data.companyId || this.data.CompanyId) : (this.isSuperAdmin ? null : this.loggedInCompanyId);
    this.loadRoles(initialCid);
    this.loadBranches(initialCid);
  }

  checkSuperAdminDuplicate() {
    if (this.isEdit) return; // Skip on edit

    const selectedCid = this.userForm.get('CompanyId')?.value;
    const selectedRoleIds = this.userForm.get('RoleIds')?.value || [];
    
    // Find if 'Super Admin' is among selected roles
    const superAdminRole = this.roles.find(r => r.roleName === 'Super Admin');
    const isSelectingSuperAdmin = superAdminRole && selectedRoleIds.includes(superAdminRole.id);

    // Only check for tenant companies (cid exists)
    if (selectedCid && isSelectingSuperAdmin) {
      this.checkingSuperAdmin = true;
      this.userService.getPaged({ 
        pageNumber: 1, 
        pageSize: 100, 
        searchTerm: 'Super Admin' // Narrow down search
      }).subscribe({
        next: (res) => {
          // Check if any existing user in THIS company already has the Super Admin role
          const exists = res.items.some((u: any) => 
            (u.companyId === selectedCid || u.CompanyId === selectedCid) && 
            (u.roles || u.Roles || []).includes('Super Admin')
          );
          
          this.isDuplicateSuperAdmin = exists;
          this.checkingSuperAdmin = false;
        },
        error: () => {
          this.checkingSuperAdmin = false;
        }
      });
    } else {
      this.isDuplicateSuperAdmin = false;
    }
  }

  checkEmailDuplicate(email: string) {
    if (this.isEdit || !email || this.userForm.get('Email')?.invalid) {
      this.isDuplicateEmail = false;
      return;
    }

    this.checkingEmail = true;
    this.userService.checkDuplicate('', email, null).subscribe({
      next: (res) => {
        this.isDuplicateEmail = res.exists;
        this.checkingEmail = false;
      },
      error: () => {
        this.checkingEmail = false;
      }
    });
  }

  loadBranches(companyId: string | null) {
    if (!companyId) {
      this.branches = [];
      return;
    }

    this.isLoadingBranches = true;
    this.companyService.getById(companyId).subscribe({
      next: (profile) => {
        // Map addresses to branches.
        this.branches = profile.addresses || [];
        this.isLoadingBranches = false;
        
        // If editing, patch the value after load
        if (this.isEdit && this.data) {
           const branchId = this.data.branchId || this.data.BranchId;
            if (branchId) {
              // 🔄 Convert to number array
              const branchArray = branchId.toString().split(',').map((id: string) => !isNaN(Number(id.trim())) ? Number(id.trim()) : id.trim());
              this.userForm.patchValue({ BranchId: branchArray }, { emitEvent: false });
            } else {
              // 🔥 FIX: Use 'GLOBAL' string for reliable selection
              this.userForm.patchValue({ BranchId: ['GLOBAL'] }, { emitEvent: false });
            }
        } else {
           // 🔥 NEW USER CASE: Auto-select active branch if not set
           const activeBid = this.authService.getBranchId();
           if (activeBid) {
             console.log('--- NEW USER: Auto-selecting branch', activeBid);
             const activeBids = activeBid.split(',').map(b => !isNaN(Number(b.trim())) ? Number(b.trim()) : b.trim());
             this.userForm.patchValue({ BranchId: activeBids }, { emitEvent: false });
           }
        }
      },
      error: () => {
        this.isLoadingBranches = false;
        this.branches = [];
      }
    });
  }

  loadRoles(companyId: string | null) {
     this.isLoadingRoles = true;
     this.roleService.getByCompany(companyId).subscribe({
       next: (roles) => {
          const currentRole = this.authService.getUserRole();
          const selectedCid = this.userForm.get('CompanyId')?.value;

          // 🛡️ SECURITY FILTER: 
          // 1. If it's a tenant company (NOT our Admin Dashboard), ALWAYS hide "Default Admin" and other Platform Roles.
          // 2. If it's our Admin Dashboard (or Master context), show them only to authorized admins.
          
          const isAdminDashboard = (selectedCid === this.loggedInCompanyId) || (!selectedCid && !this.loggedInCompanyId);

          if (!isAdminDashboard) {
            // 🚀 Tenant Context: Only show 'Super Admin' (NULL Company) and Custom Roles (this Company)
            this.roles = roles.filter(r => {
                if (!r.companyId) return r.roleName === 'Super Admin'; // Only allow Super Admin from system roles
                return true; // Allow all custom roles of this company
            });
          } else {
            // 🚀 Master Context: Hide 'Default Admin' unless the logged-in user IS one.
            this.roles = roles.filter(r => r.roleName !== 'Default Admin' || currentRole === 'Default Admin');
          }
          
          this.isLoadingRoles = false;
          
          // Reset role selection to avoid cross-tenant role leftovers
          this.userForm.patchValue({ RoleIds: [] }, { emitEvent: false });
       },
       error: () => {
         this.isLoadingRoles = false;
       }
     });
  }

  ngOnInit() {
    const defaultCompanyId = this.isEdit ? this.data.companyId || this.data.CompanyId : this.userForm.get('CompanyId')?.value;

    const companies$ = this.isSuperAdmin 
      ? this.companyService.getPaged({ pageNumber: 1, pageSize: 100 }) 
      : this.companyService.getCompanyProfile(); // Tenant admins get their own profile
    
    const roles$ = this.roleService.getByCompany(defaultCompanyId || null);

    // 🏗️ Wait for BOTH Companies and Roles to be ready
    forkJoin({
      companiesRes: companies$,
      roles: roles$
    }).subscribe(({ companiesRes, roles }) => {
      let allCompanies: any[] = [];
      const loggedInCompanyId = this.authService.getCompanyId();

      if (this.isSuperAdmin) {
        allCompanies = (companiesRes as any).items || [];
      } else {
        // Wrap single profile in array
        allCompanies = companiesRes ? [companiesRes] : [];
      }

      // 🛡️ RESTRAIN: If logged into a company context AND NOT a global root admin, ONLY show that company
      if (loggedInCompanyId && !this.isSuperAdmin) {
        this.companies = allCompanies.filter((c: any) => c.id === loggedInCompanyId);
        
        // Auto-select the only available company if it's not already set
        if (!this.userForm.get('CompanyId')?.value) {
            this.userForm.patchValue({ CompanyId: loggedInCompanyId }, { emitEvent: false });
        }
      } else {
        this.companies = allCompanies;
      }

      // 🛡️ SECURITY FILTER: Hide 'Default Admin' if a tenant company is selected
      const currentRole = this.authService.getUserRole();
      const isAdminDashboard = (defaultCompanyId === this.loggedInCompanyId) || (!defaultCompanyId && !this.loggedInCompanyId);
      
      this.roles = roles.filter(r => {
        if (!isAdminDashboard) {
           // 🚀 Tenant Context (Filter during initial load)
           if (!r.companyId) return r.roleName === 'Super Admin';
           return true;
        } else {
           // 🚀 Master Context
           if (r.roleName === 'Default Admin') {
             return currentRole === 'Default Admin';
           }
           return true;
        }
      });

      if (this.isEdit && this.data) {
        // Handle Casing Safety
        const userRoleNames = this.data.roles || this.data.Roles || [];
        const userName = this.data.userName || this.data.UserName;
        const email = this.data.email || this.data.Email;
        const companyId = this.data.companyId || this.data.CompanyId || null;

        // Map names to IDs
        const selectedRoleIds = this.roles
          .filter(r => userRoleNames.some((name: string) => name.toLowerCase() === r.roleName.toLowerCase()))
          .map(r => r.id);

        this.userForm.patchValue({
          UserName: userName,
          Email: email,
          RoleIds: selectedRoleIds,
          CompanyId: companyId
        }, { emitEvent: false });

        // 🔥 CRITICAL: Manually load branches for the user's company in edit mode
        if (companyId) {
            this.loadBranches(companyId);
        }
      }
    });
  }

  save() {
    if (this.userForm.valid) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: this.isEdit ? 'Confirm Update User' : 'Confirm Create User',
          message: `Are you sure you want to ${this.isEdit ? 'update' : 'create'} user: ${this.isEdit ? this.data.userName : this.userForm.get('UserName')?.value}?`,
          confirmText: this.isEdit ? 'Yes, Update' : 'Yes, Create'
        }
      });

      dialogRef.afterClosed().subscribe(confirm => {
        if (confirm) {
          const formValue = this.userForm.getRawValue();
          const dto: any = {
            UserName: formValue.UserName,
            Email: formValue.Email,
            RoleIds: formValue.RoleIds,
            CompanyId: formValue.CompanyId,
            BranchId: (formValue.BranchId && formValue.BranchId.length > 0) 
                      ? (formValue.BranchId.includes('GLOBAL') ? null : formValue.BranchId.join(',')) 
                      : null
          };
          
          // 🛠️ DEBUG LOGS
          console.log('--- USER CREATION DEBUG ---');
          console.log('Active Branch in LocalStorage:', localStorage.getItem('branchId'));
          console.log('Form Value:', formValue);
          console.log('Sending DTO to API:', dto);
          
          if (formValue.Password) {
            dto.Password = formValue.Password;
          }

          if (this.isEdit) {
            dto.Id = this.data.id || this.data.Id;
            dto.IsActive = this.data.isActive !== undefined ? this.data.isActive : this.data.IsActive;
            this.userService.updateUser(dto.Id, dto).subscribe({
              next: () => {
                this.notificationService.showStatus(true, 'User Updated Successfully');
                this.dialogRef.close(true);
              },
              error: (err) => {
                console.error(err);
                this.notificationService.showStatus(false, err.error?.message || 'Failed to update user');
              }
            });
          } else {
            // Before save, check for duplicates
            this.userService.checkDuplicate(dto.UserName, dto.Email, dto.CompanyId).subscribe({
              next: (res) => {
                if (res.exists) {
                  this.notificationService.showStatus(false, res.message);
                } else {
                  // Proceed to create
                  this.userService.createUser(dto).subscribe({
                    next: () => {
                      this.notificationService.showStatus(true, 'User Created Successfully');
                      this.dialogRef.close(true);
                    },
                    error: (err) => {
                      console.error(err);
                      this.notificationService.showStatus(false, err.error?.message || 'Failed to create user');
                    }
                  });
                }
              },
              error: (err) => {
                console.error(err);
                this.notificationService.showStatus(false, 'Error checking duplicate user');
              }
            });
          }
        }
      });
    }
  }
}
