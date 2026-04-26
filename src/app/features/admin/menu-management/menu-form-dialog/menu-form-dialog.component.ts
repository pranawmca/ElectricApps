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
import { catchError, delay, finalize, forkJoin, of, tap } from 'rxjs';
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
    isBulk = false;
    selectedItems: MenuItem[] = [];

    constructor(
        private fb: FormBuilder,
        private menuService: MenuService,
        private dialog: MatDialog,
        private companyService: CompanyService,
        private authService: AuthService,
        private loadingService: LoadingService,
        private cdr: ChangeDetectorRef,
        private dialogRef: MatDialogRef<MenuFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { menu: MenuItem | null, allMenus: MenuItem[], isBulk?: boolean, selectedItems?: MenuItem[] }
    ) {
        this.isSuperAdmin = this.authService.isSuperAdmin();
        this.isBulk = data.isBulk || false;
        this.selectedItems = data.selectedItems || [];
        
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
            branchId: [this.parseBranchIds(defaultBranchId)]
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
        // No longer using single selectedBranchName variable as we use getSelectedBranchText()
    }

    isGlobalSelected(): boolean {
        const value = this.menuForm.get('branchId')?.value;
        return Array.isArray(value) && value.includes('GLOBAL');
    }

    toggleGlobal() {
        const value = this.menuForm.get('branchId')?.value;
        if (Array.isArray(value) && value.includes('GLOBAL')) {
            // If Global is selected, clear everything else
            this.menuForm.patchValue({ branchId: ['GLOBAL'] });
        }
    }

    getSelectedBranchText(): string {
        const selectedIds = this.menuForm.get('branchId')?.value;
        if (!Array.isArray(selectedIds) || selectedIds.length === 0) return 'Select Branch';
        
        if (selectedIds.includes('GLOBAL')) return 'All Branches (Global)';
        
        if (selectedIds.length === 1) {
            const branch = this.branches.find(b => String(b.id) === String(selectedIds[0]));
            return branch ? branch.branchName : '1 Branch Selected';
        }
        
        return `${selectedIds.length} Branches Selected`;
    }

    parseBranchIds(branchId: string | null): string[] {
        if (!branchId || branchId === 'GLOBAL') return ['GLOBAL'];
        // Split comma-separated IDs and return as array
        return branchId.split(',').map(id => id.trim());
    }

    onBranchChange() {
        const value = this.menuForm.get('branchId')?.value;
        if (Array.isArray(value) && value.length > 1 && value.includes('GLOBAL')) {
            // If user selects a branch while Global was selected, remove Global
            const newValue = value.filter(id => id !== 'GLOBAL');
            this.menuForm.patchValue({ branchId: newValue });
        }
        if (Array.isArray(value) && value.length === 0) {
            this.menuForm.patchValue({ branchId: ['GLOBAL'] });
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.menuForm.invalid) return;

        const actionText = this.data.menu?.id ? 'Update' : 'Create';
        const branchValue = this.menuForm.get('branchId')?.value;
        const finalBranchId = (Array.isArray(branchValue) && branchValue.includes('GLOBAL')) 
            ? null 
            : (Array.isArray(branchValue) ? branchValue.join(',') : null);

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
                
                if (this.isBulk) {
                    this.bulkSave(finalBranchId);
                    return;
                }

                const menuData: MenuItem = {
                    ...this.data.menu,
                    ...this.menuForm.getRawValue(),
                    branchId: finalBranchId
                };

                const action = this.data.menu?.id
                    ? this.menuService.updateMenu(this.data.menu.id as any, menuData)
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

    private bulkSave(finalBranchId: string | null): void {
        const updateTasks = this.selectedItems.map(item => {
            const updatedItem = { ...item, branchId: finalBranchId };
            return this.menuService.updateMenu(item.id as any, updatedItem).pipe(
                catchError(err => {
                    console.error(`Failed to update menu ${item.id}`, err);
                    return of(null);
                })
            );
        });

        forkJoin(updateTasks).pipe(delay(800)).subscribe(() => {
            this.loadingService.setLoading(false);
            this.dialogRef.close(true);
        });
    }
}
