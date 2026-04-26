import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { MenuItem } from '../../../../core/models/menu-item.model';
import { MenuService } from '../../../../core/services/menu.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { CompanyService } from '../../../company/services/company.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { delay, finalize } from 'rxjs/operators';
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
    companies: any[] = [];
    loadingBranches = true; // Default to true to ensure loader shows immediately
    currentCompanyName = '';
    selectedBranchName = 'All Branches (Global)';

    constructor(
        private fb: FormBuilder,
        private menuService: MenuService,
        private dialog: MatDialog,
        private companyService: CompanyService,
        private authService: AuthService,
        private loadingService: LoadingService,
        private cdr: ChangeDetectorRef,
        private dialogRef: MatDialogRef<MenuFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { menu: MenuItem | null, allMenus: MenuItem[] }
    ) {
        this.isSuperAdmin = this.authService.isSuperAdmin();
        
        const defaultCompanyId = this.data.menu?.companyId || this.authService.getCompanyId();
        
        // Correctly handle edit mode vs insert mode for branches
        let defaultBranchId = 'GLOBAL';
        if (this.data.menu) {
            defaultBranchId = this.data.menu.branchId || 'GLOBAL';
        } else {
            defaultBranchId = this.authService.getBranchId() || 'GLOBAL';
        }

        this.menuForm = this.fb.group({
            title: [this.data.menu?.title || '', [Validators.required]],
            url: [this.data.menu?.url || ''],
            icon: [this.data.menu?.icon || ''],
            parentId: [this.data.menu?.parentId || null],
            order: [this.data.menu?.order || 0, [Validators.required]],
            companyId: [{ value: defaultCompanyId, disabled: true }],
            branchId: [defaultBranchId]
        });
    }

    ngOnInit(): void {
        this.currentCompanyName = this.authService.getCompanyName() || 'System';
        
        // Ensure loading state is active and detected immediately
        this.loadingBranches = true;
        this.cdr.detectChanges();

        if (this.isSuperAdmin) {
            this.loadCompanies();
        }
        this.loadBranches();
    }

    loadCompanies() {
        this.companyService.getAllCompanies().subscribe((res: any) => {
            this.companies = res;
        });
    }

    onCompanyChange() {
        this.menuForm.patchValue({ branchId: 'GLOBAL' });
        this.loadBranches();
    }

    loadBranches() {
        const companyId = this.menuForm.getRawValue().companyId;
        
        if (companyId) {
            this.loadingBranches = true;
            this.companyService.getBranchesByCompany(companyId).pipe(
                delay(800) // Force loader to be visible for a moment
            ).subscribe({
                next: (res: any) => {
                    this.branches = (res || []).map((b: any) => ({
                        ...b,
                        id: b.id ? String(b.id) : b.branchId ? String(b.branchId) : ''
                    }));
                    this.updateSelectedBranchName();
                    this.loadingBranches = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('[MenuFormDialog] Error loading branches:', err);
                    this.loadingBranches = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    updateSelectedBranchName() {
        const branchId = this.menuForm.get('branchId')?.value;
        if (!branchId || branchId === 'GLOBAL') {
            this.selectedBranchName = 'All Branches (Global)';
        } else {
            // Backend uses int for Id in some cases (e.g. 1002), so we compare as strings
            const branch = this.branches.find(b => String(b.id) === String(branchId));
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
                this.loadingService.setLoading(true, `${actionText}ing menu item...`);
                
                const menuData: MenuItem = {
                    ...this.data.menu,
                    ...this.menuForm.getRawValue(),
                    branchId: this.menuForm.get('branchId')?.value === 'GLOBAL' ? null : this.menuForm.get('branchId')?.value
                };

                const action = this.data.menu?.id
                    ? this.menuService.updateMenu(this.data.menu.id, menuData)
                    : this.menuService.createMenu(menuData);

                action.pipe(
                    delay(800), // Artificial delay for "soft update" feel
                    finalize(() => {
                        this.loading = false;
                        this.loadingService.setLoading(false);
                    })
                ).subscribe({
                    next: () => {
                        this.dialogRef.close(true);
                    },
                    error: (err) => {
                        console.error(err);
                    }
                });
            }
        });
    }
}
