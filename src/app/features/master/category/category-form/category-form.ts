import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { Validators, FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { CategoryService } from '../services/category.service';
import { MatDialog } from '@angular/material/dialog';
import { ApiResultDialog } from '../../../shared/api-result-dialog/api-result-dialog';

import { Category } from '../models/category.model';

import { FormFooter } from '../../../shared/form-footer/form-footer';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../../core/services/auth.service';
import { SubCategoryService } from '../../subcategory/services/subcategory.service';


@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MaterialModule, RouterLink],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss',
})
export class CategoryForm implements OnInit {
  categoryForm!: FormGroup;
  loading = false;
  categoryId: string | null = null;



  constructor(private fb: FormBuilder, private dialog: MatDialog,
    private cdr: ChangeDetectorRef, private zone: NgZone,
    private route: ActivatedRoute, private router: Router) { }

  readonly categorySvc = inject(CategoryService);
  readonly subCategorySvc = inject(SubCategoryService);
  private authService = inject(AuthService);
  subcategories: any[] = [];
  editingIndex: number | null = null;
  tempSubcat: any = null;

  ngOnInit(): void {
    this.createForm();
    this.categoryId = this.route.snapshot.paramMap.get('id');
    if (this.categoryId) {
      this.loadCategory();
      this.loadSubCategories();
    }
  }

  createForm() {
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      categoryCode: [''],
      defaultGst: [0, [Validators.min(0), Validators.max(100)]],
      description: [''],
      isActive: [true]
    });
    this.cdr.detectChanges();
  }

  loadCategory() {
    if (!this.categoryId) return;
    this.loading = true;
    this.categorySvc.getById(this.categoryId).subscribe({
      next: (res) => {
        this.categoryForm.patchValue(res);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSubCategories() {
    if (!this.categoryId) return;
    this.subCategorySvc.getByCategoryId(this.categoryId).subscribe({
      next: (res) => {
        this.subcategories = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading subcategories', err);
      }
    });
  }

  // --- Inline Editing Methods ---
  
  startEdit(index: number): void {
    this.editingIndex = index;
    this.tempSubcat = { ...this.subcategories[index] };
  }

  cancelEdit(): void {
    if (this.editingIndex !== null && this.tempSubcat) {
      this.subcategories[this.editingIndex] = { ...this.tempSubcat };
    }
    this.editingIndex = null;
    this.tempSubcat = null;
  }

  saveInlineSubcategory(index: number): void {
    const subcat = this.subcategories[index];
    if (!subcat.subcategoryName) return;

    this.loading = true;
    const payload = {
      ...subcat,
      name: subcat.subcategoryName, // Backend expects 'Name'
      code: subcat.subcategoryCode, // Backend expects 'Code'
      companyId: this.authService.getCompanyId(),
      branchId: this.authService.getBranchId(),
      modifiedBy: this.authService.getUserEmail()
    };

    // Remove navigation property if it's null or empty to prevent backend binding errors
    if (payload.category === null || payload.category === undefined) {
      delete payload.category;
    }

    this.subCategorySvc.update(subcat.id, payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.editingIndex = null;
        this.tempSubcat = null;
        this.dialog.open(StatusDialogComponent, {
          data: { isSuccess: true, message: 'Subcategory updated successfully' }
        });
        this.loadSubCategories();
      },
      error: (err) => {
        this.loading = false;
        this.dialog.open(StatusDialogComponent, {
          data: { isSuccess: false, message: 'Failed to update subcategory' }
        });
      }
    });
  }

  deleteSubcategory(id: string): void {
    this.dialog.open(StatusDialogComponent, {
        data: { isSuccess: false, message: 'Confirm deletion?', title: 'Delete Subcategory', status: 'confirm' }
    }).afterClosed().subscribe(confirm => {
        if (!confirm) return;
        
        this.loading = true;
        this.subCategorySvc.delete(id).subscribe({
            next: () => {
                this.loading = false;
                this.loadSubCategories();
            },
            error: () => {
                this.loading = false;
            }
        });
    });
  }

  selectedFile: File | null = null;
  selectedFileName: string = '';

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // 1. Extension Check
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isExtensionValid = validExtensions.includes(fileExtension);

      if (!isExtensionValid) {
        this.showError('Invalid file extension. Please upload .xlsx, .xls, or .csv file.');
        this.resetFile(event.target);
        return;
      }

      // 2. File Size Check (Max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.showError('File size exceeds 5MB limit.');
        this.resetFile(event.target);
        return;
      }

      // 3. MIME Type Check
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', 'application/csv', 'text/x-csv', 'application/x-csv', 'text/comma-separated-values', 'text/x-comma-separated-values', // .csv
        'application/vnd.oasis.opendocument.spreadsheet', // .ods
        '' // Sometimes CSV has empty mime type on Windows
      ];

      if (file.type && !validMimeTypes.includes(file.type)) {
        this.showError('Invalid file format (MIME type mismatch).');
        this.resetFile(event.target);
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  private showError(message: string): void {
    this.dialog.open(StatusDialogComponent, {
      data: { isSuccess: false, message: message }
    });
  }

  downloadTemplate() {
    const data = [
      ["CategoryCode", "CategoryName", "DefaultGst", "Description"],
      ["ELEC", "Smart Electrical", 18, "Electrical items and appliances"],
      ["GROC1", "Grains & Pulses", 5, "Rice, Wheat, Dals"],
      ["GROC2", "Edible Oils", 5, "Cooking and refined oils"],
      ["GROC3", "Spices", 5, "Whole and powdered spices"],
      ["GROC4", "Beverages", 5, "Tea, Coffee, Juices"],
      ["GROC5", "Snacks", 12, "Biscuits, Chips, Namkeen"],
      ["GROC6", "Dairy", 12, "Milk, Ghee, Butter, Paneer"],
      ["GROC7", "Cleaning", 18, "Detergents, Soaps, Cleaners"],
      ["GROC8", "Personal Care", 18, "Shampoo, Conditioners, Face wash"],
      ["GROC9", "Noodles & Pasta", 12, "Instant noodles and pasta"],
      ["GROC10", "Sauces & Spreads", 12, "Ketchup, Jams, Mayo"],
      ["GROC11", "Groceries", 5, "Sugar, Salt, General items"]
    ];

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CategoryTemplate');
    XLSX.writeFile(wb, 'category_template.xlsx');
  }

  uploadExcel(): void {
    if (!this.selectedFile) return;

    this.loading = true;

    this.categorySvc.uploadExcel(this.selectedFile).subscribe({
      next: (res) => {
        this.loading = false;

        let finalMessage = res.message || res.Message || 'File uploaded successfully';
        const errors = res.errors || res.Errors || [];

        if (errors.length > 0) {
          finalMessage += '\n\nRow-wise Status/Errors:\n' + errors.join('\n');
        }

        // Determine success based on whether anything was uploaded
        const successCountString = (res.message || res.Message || '0');
        const successCount = parseInt(successCountString) || 0;
        const hasErrors = errors.length > 0;

        this.dialog.open(StatusDialogComponent, {
          data: {
            isSuccess: !hasErrors, // Show as error if any row failed
            message: finalMessage
          }
        }).afterClosed().subscribe(() => {
          if (!hasErrors || successCount > 0) {
            this.router.navigate(['/app/master/categories']);
          }
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.dialog.open(StatusDialogComponent, {
          data: {
            isSuccess: false,
            message: err.error?.message ?? 'Upload failed. Please ensure the Excel/CSV structure is correct.'
          }
        });
        this.cdr.detectChanges();
      }
    });
  }

  resetFile(input?: HTMLInputElement): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    if (input) {
      input.value = '';
    }
  }

  onSave(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const categoryName = this.categoryForm.get('categoryName')?.value;
    this.loading = true;

    // Check for duplicate category name before saving
    this.categorySvc.checkDuplicate(categoryName, this.categoryId).subscribe({
      next: (res) => {
        if (res.exists) {
          this.loading = false;
          this.cdr.detectChanges();
          this.dialog.open(StatusDialogComponent, {
            data: { isSuccess: false, message: res.message || 'Category with this name already exists.' }
          });
        } else {
          this.proceedWithSave();
        }
      },
      error: (err) => {
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Duplicate check failed', err);
        // Fallback or proceed
        this.proceedWithSave();
      }
    });
  }

  private proceedWithSave(): void {
    this.loading = true;
    const payload: Category = {
      ...this.categoryForm.value,
      id: this.categoryId,
      companyId: this.authService.getCompanyId(),
      branchId: this.authService.getBranchId()
    };

    if (this.categoryId) {
      payload.modifiedBy = this.authService.getUserEmail();
    } else {
      payload.createdBy = this.authService.getUserEmail();
    }

    const request = this.categoryId
      ? this.categorySvc.update(this.categoryId, payload)
      : this.categorySvc.create(payload);

    request.subscribe({
      next: (res) => {
        this.loading = false;
        this.dialog.open(StatusDialogComponent, {
          data: {
            isSuccess: true,
            message: res.message
          }
        }).afterClosed().subscribe(() => {
          this.cdr.detectChanges();
          this.router.navigate(['/app/master/categories']);
        });
      },
      error: (err) => {
        this.dialog.open(StatusDialogComponent, {
          data: {
            isSuccess: false,
            message: err.error?.message ?? 'Something went wrong'
          }
        }).afterClosed().subscribe(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }


  onCancel() {
    this.router.navigate(['/app/master/categories']);
  }

}

