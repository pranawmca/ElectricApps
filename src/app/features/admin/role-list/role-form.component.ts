import { Component, Inject, OnInit } from '@angular/core';
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
        <mat-form-field appearance="outline" *ngIf="isSuperAdmin && !isEdit">
          <mat-label>Assign Company</mat-label>
          <mat-select formControlName="CompanyId">
            <mat-option [value]="null">Master (System Role)</mat-option>
            <mat-option *ngFor="let company of companies" [value]="company.id">{{company.name}}</mat-option>
          </mat-select>
          <mat-icon matPrefix>business</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="RoleName" placeholder="e.g. Sales Manager">
          <mat-icon matPrefix>admin_panel_settings</mat-icon>
          <mat-error *ngIf="roleForm.get('RoleName')?.hasError('required')">Role name is required</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-raised-button mat-dialog-close class="cancel-btn">CANCEL</button>
      <button mat-raised-button class="main-add-btn" [disabled]="roleForm.invalid" (click)="save()">{{ isEdit ? 'UPDATE ROLE' : 'CREATE ROLE' }}</button>
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

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private companyService: CompanyService,
    private authService: AuthService,
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
      CompanyId: [null]
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin && !this.isEdit) {
      this.companyService.getPaged({ pageNumber: 1, pageSize: 100 }).subscribe((res: any) => {
        this.companies = res.items || [];
      });
    }

    if (this.isEdit && this.data) {
      this.roleForm.patchValue({
        RoleName: this.data.roleName,
        CompanyId: this.data.companyId || null
      });
    }
  }

  save() {
    if (this.roleForm.valid) {
      const { RoleName, CompanyId } = this.roleForm.value;
      if (this.isEdit) {
        this.roleService.updateRole(this.data.id, RoleName).subscribe({
          next: () => {
            this.showStatus(true, 'Role updated successfully!');
            this.dialogRef.close(true);
          },
          error: (err) => this.showStatus(false, err.error?.message || 'Failed to update role')
        });
      } else {
        this.roleService.createRole(RoleName, CompanyId).subscribe({
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
