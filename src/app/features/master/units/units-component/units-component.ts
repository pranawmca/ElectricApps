import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { UnitService } from '../services/units.service';
import { SummaryStat, SummaryStatsComponent } from '../../../../shared/components/summary-stats-component/summary-stats-component';
import { LoadingService } from '../../../../core/services/loading.service';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';

@Component({
  selector: 'app-units',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, SummaryStatsComponent],
  templateUrl: './units-component.html',
  styleUrl: './units-component.scss',
})
export class UnitsComponent implements OnInit {
  unitForm: FormGroup;
  isSaving = false;
  summaryStats: SummaryStat[] = [];
  isLoading = false;
  isEditMode = false;
  unitId: string | null = null;
  private dbUnits: any[] = [];

  constructor(
    private fb: FormBuilder,
    private unitService: UnitService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService,
    private dialog: MatDialog
  ) {
    this.unitForm = this.fb.group({
      units: this.fb.array([])
    });
  }

  ngOnInit() {
    this.unitId = this.route.snapshot.paramMap.get('id');
    if (this.unitId) {
      this.isEditMode = true;
      this.loadUnitForEdit();
    } else {
      this.addUnitRow();
    }
    this.loadStats();
  }

  loadUnitForEdit() {
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.unitService.getById(this.unitId!).subscribe({
      next: (unit: any) => {
        const row = this.fb.group({
          name: [unit.name, Validators.required],
          description: [unit.description],
          isActive: [unit.isActive],
          id: [unit.id]
        });
        this.units.push(row);
        this.isLoading = false;
        this.loadingService.setLoading(false);
      },
      error: () => {
        this.dialog.open(StatusDialogComponent, {
          width: '400px',
          data: {
            isSuccess: false,
            status: 'error',
            title: 'Error',
            message: 'Error loading unit details'
          }
        });
        this.router.navigate(['/app/master/units']);
      }
    });
  }

  loadStats() {
    this.isLoading = true;
    this.loadingService.setLoading(true);
    this.unitService.getAll().subscribe({
      next: (data: any) => {
        this.dbUnits = data || [];
        this.updateStats();
        this.isLoading = false;
        this.loadingService.setLoading(false);
      },
      error: () => {
        this.isLoading = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  private updateStats(): void {
    const rowCount = this.units?.length || 0;
    const active = this.dbUnits.filter(u => u.isActive).length;
    const inactive = this.dbUnits.length - active;

    this.summaryStats = [
      { label: 'Total Count', value: rowCount, icon: 'add_task', type: 'info' },
      { label: 'Active (Master)', value: active, icon: 'check_circle', type: 'success' },
      { label: 'Inactive (Master)', value: inactive, icon: 'block', type: 'warning' }
    ];
  }

  goBack() {
    this.router.navigate(['/app/master/units']);
  }

  get units() { return this.unitForm.get('units') as FormArray; }

  addUnitRow() {
    const row = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true]
    });
    this.units.push(row);
    this.updateStats();
  }

  removeUnitRow(index: number) {
    this.units.removeAt(index);
    this.updateStats();
  }

  saveUnits() {
    if (this.unitForm.invalid) return;

    this.isSaving = true;
    this.loadingService.setLoading(true);
    const unitsData = this.unitForm.value.units;

    if (this.isEditMode) {
      const unitData = unitsData[0];
      this.unitService.update(this.unitId!, unitData).subscribe({
        next: () => {
          this.loadingService.setLoading(false);
          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: true,
              status: 'success',
              title: 'Success',
              message: 'Unit updated successfully!'
            }
          });
          this.router.navigate(['/app/master/units']);
        },
        error: (err: any) => {
          this.isSaving = false;
          this.loadingService.setLoading(false);
          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: false,
              status: 'error',
              title: 'Error',
              message: 'Error updating unit.'
            }
          });
        }
      });
    } else {
      this.unitService.saveBulkUnits(unitsData).subscribe({
        next: (res: any) => {
          this.loadingService.setLoading(false);
          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: true,
              status: 'success',
              title: 'Success',
              message: 'All units saved successfully!'
            }
          });
          this.router.navigate(['/app/master/units']);
        },
        error: (err: any) => {
          this.isSaving = false;
          this.loadingService.setLoading(false);
          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: false,
              status: 'error',
              title: 'Error',
              message: 'Error saving units. Please try again.'
            }
          });
        }
      });
    }
  }
}
