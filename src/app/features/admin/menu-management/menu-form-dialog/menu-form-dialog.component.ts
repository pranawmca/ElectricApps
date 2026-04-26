import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { MenuItem } from '../../../../core/models/menu-item.model';
import { MenuService } from '../../../../core/services/menu.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { CompanyService } from '../../../company/services/company.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-menu-form-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatDialogModule],
    templateUrl: './menu-form-dialog.component.html',
    styleUrl: './menu-form-dialog.component.scss'
})
export class MenuFormDialogComponent implements OnInit {
    menuForm: FormGroup;
    loading = false;
    isSuperAdmin = false;
    branches: any[] = [];
    selectedBranchName = 'All Branches (Global)';

    constructor(
        private fb: FormBuilder,
        private menuService: MenuService,
        private dialog: MatDialog,
        private companyService: CompanyService,
        private authService: AuthService,
        private dialogRef: MatDialogRef<MenuFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { menu: MenuItem | null, allMenus: MenuItem[] }
    ) {
        this.isSuperAdmin = this.authService.isSuperAdmin();
        
        this.menuForm = this.fb.group({
            title: [this.data.menu?.title || '', [Validators.required]],
            url: [this.data.menu?.url || ''],
            icon: [this.data.menu?.icon || ''],
            parentId: [this.data.menu?.parentId || null],
            order: [this.data.menu?.order || 0, [Validators.required]],
            companyId: [this.data.menu?.companyId || null],
            branchId: [this.data.menu?.branchId || 'GLOBAL']
        });
    }

    ngOnInit(): void {
        this.loadBranches();
    }

    loadBranches() {
        const companyId = this.menuForm.get('companyId')?.value;
        if (companyId) {
            this.companyService.getBranchesByCompany(companyId).subscribe((res: any) => {
                this.branches = res;
                this.updateSelectedBranchName();
            });
        }
    }

    updateSelectedBranchName() {
        const branchId = this.menuForm.get('branchId')?.value;
        if (branchId === 'GLOBAL') {
            this.selectedBranchName = 'All Branches (Global)';
        } else {
            const branch = this.branches.find(b => b.branchId === branchId);
            this.selectedBranchName = branch ? branch.branchName : 'All Branches (Global)';
        }
    }

    onBranchChange() {
        this.updateSelectedBranchName();
    }

    save(): void {
        if (this.menuForm.invalid) return;

        const actionText = this.data.menu?.id ? 'Update' : 'Create';
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: `Confirm ${actionText}`,
                message: `Are you sure you want to ${actionText.toLowerCase()} this menu item: ${this.menuForm.value.title}?`,
                confirmText: `Yes, ${actionText}`
            }
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (confirm) {
                this.loading = true;
                const menuData: MenuItem = {
                    ...this.data.menu,
                    ...this.menuForm.value,
                    branchId: this.menuForm.value.branchId === 'GLOBAL' ? null : this.menuForm.value.branchId
                };

                const action = this.data.menu?.id
                    ? this.menuService.updateMenu(this.data.menu.id, menuData)
                    : this.menuService.createMenu(menuData);

                action.subscribe({
                    next: () => {
                        this.loading = false;
                        this.dialogRef.close(true);
                    },
                    error: (err) => {
                        console.error(err);
                        this.loading = false;
                        // Ideally show error message
                    }
                });
            }
        });
    }
}
