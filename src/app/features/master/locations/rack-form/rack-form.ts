import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { LocationService } from '../services/locations.service';
import { Warehouse, Rack } from '../models/locations.model';
import { LoadingService } from '../../../../core/services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';
import { SummaryStat, SummaryStatsComponent } from '../../../../shared/components/summary-stats-component/summary-stats-component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-rack-form',
    standalone: true,
    imports: [CommonModule, MaterialModule, ReactiveFormsModule, RouterLink,
        SummaryStatsComponent],
    templateUrl: './rack-form.html',
    styleUrl: './rack-form.scss',
})
export class RackForm implements OnInit {
    rackForm: FormGroup;
    isEditMode = false;
    rackId: string | null = null;
    isLoading = false;
    warehouses: Warehouse[] = [];
    warehouseSearchTerm: string = '';

    get filteredWarehouses() {
        if (!this.warehouseSearchTerm) return this.warehouses;
        const search = this.warehouseSearchTerm.toLowerCase();
        return this.warehouses.filter(w => 
            (w.name || '').toLowerCase().includes(search)
        );
    }
    summaryStats: SummaryStat[] = [];

    constructor(
        private fb: FormBuilder,
        private locationService: LocationService,
        private route: ActivatedRoute,
        private router: Router,
        private loadingService: LoadingService,
        private dialog: MatDialog,
        private authService: AuthService
    ) {
        this.rackForm = this.fb.group({
            id: [null],
            warehouseId: ['', [Validators.required]],
            name: ['', [Validators.required, Validators.maxLength(100)]],
            description: ['', [Validators.maxLength(500)]],
            isActive: [true]
        });
    }

    ngOnInit(): void {
        this.loadWarehouses();
        this.rackId = this.route.snapshot.paramMap.get('id');
        if (this.rackId) {
            this.isEditMode = true;
            this.loadRackData(this.rackId);
        } else {
            this.loadStatsOnly();
        }
    }

    loadStatsOnly() {
        this.locationService.getRacks().subscribe({
            next: (racks) => {
                this.updateStats(racks);
            }
        });
    }

    loadWarehouses() {
        this.locationService.getWarehouses().subscribe({
            next: (data) => this.warehouses = data.filter(w => w.isActive),
            error: () => console.error('Failed to load warehouses')
        });
    }

    loadRackData(id: string) {
        this.isLoading = true;
        this.loadingService.setLoading(true);
        this.locationService.getRacks().subscribe({
            next: (racks) => {
                // Case-insensitive ID matching to be safe
                const rack = racks.find(r => r.id.toLowerCase() === id.toLowerCase());
                if (rack) {
                    this.rackForm.patchValue(rack);
                }
                this.updateStats(racks);
                this.isLoading = false;
                this.loadingService.setLoading(false);
            },
            error: () => {
                this.isLoading = false;
                this.loadingService.setLoading(false);
            }
        });
    }

    private updateStats(racks: Rack[]): void {
        const total = racks.length;
        const active = racks.filter(u => u.isActive).length;
        const inactive = total - active;

        this.summaryStats = [
            { label: 'Total Racks', value: total, icon: 'view_module', type: 'info' },
            { label: 'Active', value: active, icon: 'check_circle', type: 'success' },
            { label: 'Inactive', value: inactive, icon: 'block', type: 'warning' }
        ];
    }

    onSubmit() {
        if (this.rackForm.invalid) {
            return;
        }

        this.isLoading = true;
        this.loadingService.setLoading(true);

        const payload = { 
            ...this.rackForm.value,
            branchId: this.authService.getBranchId(),
            companyId: this.authService.getCompanyId()
        };

        if (this.isEditMode && this.rackId) {
            // Ensure ID is explicitly set in payload for backend validation
            payload.id = this.rackId;
            this.locationService.updateRack(this.rackId, payload).subscribe({
                next: () => this.handleSuccess('Rack updated successfully'),
                error: (err) => this.handleError(err)
            });
        } else {
            this.locationService.createRack(payload).subscribe({
                next: () => this.handleSuccess('Rack created successfully'),
                error: (err) => this.handleError(err)
            });
        }
    }

    private handleSuccess(message: string) {
        this.isLoading = false;
        this.loadingService.setLoading(false);
        this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                isSuccess: true,
                status: 'success',
                title: 'Success',
                message: message
            }
        });
        this.router.navigate(['/app/master/racks']);
    }

    private handleError(err: any) {
        this.isLoading = false;
        this.loadingService.setLoading(false);
        this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
                isSuccess: false,
                status: 'error',
                title: 'Error',
                message: err.error?.message || 'Something went wrong'
            }
        });
    }
}

