
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-location-tracker-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './location-tracker-dialog.component.html',
  styleUrl: './location-tracker-dialog.component.scss'
})
export class LocationTrackerDialogComponent {
  activeIndex: number = 5;
  prefix: string = 'B';
  locationForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<LocationTrackerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.locationForm = this.fb.group({
      warehouseName: [this.data.warehouseName],
      rackName: [this.data.rackName],
      status: ['In Stock & Verified'],
      description: [this.data.description]
    });

    this.calculateActiveIndex();

    // Reactive update when rack name changes manually
    this.locationForm.get('rackName')?.valueChanges.subscribe(val => {
      this.calculateActiveIndex(val);
    });
  }

  selectCell(index: number) {
    const newRack = `${this.prefix}-${index}`;
    this.locationForm.get('rackName')?.setValue(newRack);
  }

  calculateActiveIndex(customRack?: string) {
    const rackName = customRack || this.data.rackName || '';

    // 1. Try to extract number from rack name (e.g., "Bin 7" -> 7, "Rack A2" -> 2)
    const numMatch = rackName.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0]);
      this.activeIndex = (num % 12) || 12;
    } else {
      // Fallback: Use string hashing of Product ID or name to get a stable 1-12 index
      const seedSource = (this.data.productId || rackName).toString();
      let hash = 0;
      for (let i = 0; i < seedSource.length; i++) {
        hash = ((hash << 5) - hash) + seedSource.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      this.activeIndex = (Math.abs(hash) % 12) + 1;
    }

    // 2. Smarter Prefix: Skip common words like "Rack", "Work", "Bench"
    // We look for capital letters that are likely Zone identifiers
    const cleanName = rackName.replace(/Rack|Work|Bench|Warehouse|Bin|Shelf|Floor/gi, '').trim();
    const prefixMatch = cleanName.match(/[A-Z]/);

    if (prefixMatch) {
      this.prefix = prefixMatch[0];
    } else {
      // Final fallback to the first capital letter of the original name if clean version has none
      const originalMatch = rackName.match(/[A-Z]/);
      this.prefix = originalMatch ? originalMatch[0] : 'B';
    }
  }

  getLabel(i: number): string {
    return `${this.prefix}-${i}`;
  }
}
