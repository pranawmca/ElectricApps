import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { ReactiveFormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { MatSort } from '@angular/material/sort';
import { LocationService } from '../services/locations.service';
import { Warehouse } from '../models/locations.model';
import { SummaryStat, SummaryStatsComponent } from '../../../../shared/components/summary-stats-component/summary-stats-component';
import { LoadingService } from '../../../../core/services/loading.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';
import { PermissionService } from '../../../../core/services/permission.service';
import { CompanyService } from '../../../company/services/company.service';
import { AuthService } from '../../../../core/services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-warehouse-list',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, RouterLink, SummaryStatsComponent],
    templateUrl: './warehouse-list.html',
    styleUrl: './warehouse-list.scss',
})
export class WarehouseList implements OnInit {
    displayedColumns: string[] = ['index', 'branch', 'name', 'city', 'description', 'status', 'actions'];
    dataSource = new MatTableDataSource<any>();
    isLoading = true;
    isDashboardLoading = true;
    private isFirstLoad = true;
    summaryStats: SummaryStat[] = [];
    branches: any[] = [];

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private locationService: LocationService,
        private cdr: ChangeDetectorRef,
        private router: Router,
        private loadingService: LoadingService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private companyService: CompanyService,
        private authService: AuthService
    ) { }

    private permissionService = inject(PermissionService);
    canAdd: boolean = true;
    canEdit: boolean = true;
    canDelete: boolean = true;

    ngOnInit(): void {
        this.canAdd = this.permissionService.hasPermission('CanAdd');
        this.canEdit = this.permissionService.hasPermission('CanEdit');
        this.canDelete = this.permissionService.hasPermission('CanDelete');

        this.isDashboardLoading = true;
        this.isFirstLoad = true;
        this.loadingService.setLoading(true);
        this.cdr.detectChanges();

        this.loadData();

        // Safety timeout - force stop loader after 10 seconds
        setTimeout(() => {
            if (this.isDashboardLoading) {
                console.warn('[WarehouseList] Force stopping loader after 10s timeout');
                this.isDashboardLoading = false;
                this.isFirstLoad = false;
                this.loadingService.setLoading(false);
                this.cdr.detectChanges();
            }
        }, 10000);
    }

    loadData() {
        this.isLoading = true;
        const companyId = this.authService.getCompanyId();
        
        if (companyId) {
            forkJoin({
                warehouses: this.locationService.getWarehouses(),
                branches: this.companyService.getBranchesByCompany(companyId)
            }).subscribe({
                next: (res) => {
                    this.branches = res.branches;
                    const mappedData = res.warehouses.map(w => ({
                        ...w,
                        branchName: this.branches.find(b => String(b.id) === String(w.branchId))?.branchName || 'Main Branch'
                    }));
                    
                    this.dataSource.data = mappedData;
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                    this.updateStats();
                    this.isLoading = false;

                    if (this.isFirstLoad) {
                        this.isFirstLoad = false;
                        this.isDashboardLoading = false;
                        this.loadingService.setLoading(false);
                    }
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.isLoading = false;
                    if (this.isFirstLoad) {
                        this.isFirstLoad = false;
                        this.isDashboardLoading = false;
                        this.loadingService.setLoading(false);
                    }
                    this.cdr.detectChanges();
                }
            });
        }
    }

    // Keep loadWarehouses for compatibility if needed elsewhere
    loadWarehouses() {
        this.loadData();
    }

    downloadTemplate(): void {
        this.locationService.downloadWarehouseTemplate().subscribe((blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Warehouse_Template.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        });
    }

    private updateStats(): void {
        const total = this.dataSource.data.length;
        const active = this.dataSource.data.filter(u => u.isActive).length;
        const inactive = total - active;

        this.summaryStats = [
            { label: 'Total Warehouses', value: total, icon: 'warehouse', type: 'info' },
            { label: 'Active', value: active, icon: 'check_circle', type: 'success' },
            { label: 'Inactive', value: inactive, icon: 'block', type: 'warning' }
        ];
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.loadingService.setLoading(true);
            this.locationService.uploadWarehousesExcel(file).subscribe({
                next: (res: any) => {
                    this.loadingService.setLoading(false);
                    this.dialog.open(StatusDialogComponent, {
                        width: '450px',
                        data: {
                            isSuccess: res.errors.length === 0,
                            status: res.errors.length === 0 ? 'success' : 'warning',
                            title: 'Bulk Upload Status',
                            message: res.message || `${res.successCount} Warehouses processed.`,
                            errors: res.errors
                        }
                    });
                    this.loadWarehouses();
                    event.target.value = ''; // Reset input
                },
                error: (err) => {
                    this.loadingService.setLoading(false);
                    this.dialog.open(StatusDialogComponent, {
                        width: '400px',
                        data: {
                            isSuccess: false,
                            status: 'error',
                            title: 'Upload Failed',
                            message: err.error || 'Failed to upload warehouses excel file'
                        }
                    });
                    event.target.value = ''; // Reset input
                }
            });
        }
    }

    editWarehouse(warehouse: Warehouse) {
        this.router.navigate(['/app/master/warehouses/edit', warehouse.id]);
    }

    deleteWarehouse(warehouse: Warehouse) {
        const dialogRef = this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                isSuccess: false,
                title: 'Delete Warehouse',
                message: `Are you sure you want to delete ${warehouse.name}?`,
                status: 'warning',
                showCancel: true,
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.isLoading = true;
                this.loadingService.setLoading(true);
                this.locationService.deleteWarehouse(warehouse.id).subscribe({
                    next: () => {
                        this.isLoading = false;
                        this.loadingService.setLoading(false);
                        this.dialog.open(StatusDialogComponent, {
                            width: '400px',
                            data: {
                                isSuccess: true,
                                status: 'success',
                                title: 'Deleted',
                                message: 'Warehouse deleted successfully'
                            }
                        });
                        this.loadWarehouses();
                    },
                    error: (err) => {
                        this.isLoading = false;
                        this.loadingService.setLoading(false);
                        this.dialog.open(StatusDialogComponent, {
                            width: '400px',
                            data: {
                                isSuccess: false,
                                status: 'error',
                                title: 'Error',
                                message: 'Failed to delete warehouse'
                            }
                        });
                        this.cdr.detectChanges();
                    }
                });
            }
        });
    }
}
