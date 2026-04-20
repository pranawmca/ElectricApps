import { Component, inject, Input } from '@angular/core';
import { PurchaseReturnService } from '../services/purchase-return.service';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material/material/material-module';

@Component({
  selector: 'app-prprint-component',
  standalone: true, // Agar aap standalone use kar rahe hain
  imports: [CommonModule, MaterialModule],
  templateUrl: './prprint-component.html',
  styleUrl: './prprint-component.scss',
})
export class PRPrintComponent {
  private prService = inject(PurchaseReturnService);
  isLoading = false;

  @Input() selectedReturn: any = null;

  // Console ke hisab se subTotal
  get subTotal(): number {
    return this.selectedReturn?.subTotal || 0;
  }

  // Console mein taxAmount field hai
  get taxAmount(): number {
    return this.selectedReturn?.taxAmount || 0;
  }

  // Items array se GST % uthane ke liye
  get gstPercentage(): number {
    return this.selectedReturn?.items?.[0]?.gstPercent || 0;
  }

  // Console mein grandTotal field hai
  get grandTotal(): number {
    return this.selectedReturn?.grandTotal || 0;
  }
}
