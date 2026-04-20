import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';

export interface SoSuccessData {
    soNumber: string;
    grandTotal: number;
    customerId: number;
    customerName: string;
    status: string;
}

@Component({
    selector: 'app-so-success-dialog',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    template: `
    <div class="so-success-dialog">
      <div class="dialog-header">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <h2 mat-dialog-title>Sale Order Saved Successfully!</h2>
      </div>

      <mat-dialog-content>
        <div class="so-details">
          <div class="detail-row">
            <span class="label">Order Number:</span>
            <span class="value">{{ data.soNumber }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Customer:</span>
            <span class="value">{{ data.customerName }}</span>
          </div>
          <div class="detail-row highlight">
            <span class="label">Grand Total:</span>
            <span class="value amount">₹{{ data.grandTotal | number:'1.2-2' }}</span>
          </div>
        </div>

        <div class="info-message">
          <mat-icon>info</mat-icon>
          <p>What would you like to do next?</p>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onViewList()">
          <mat-icon>list</mat-icon>
          View Sale Order List
        </button>
        <button mat-flat-button color="primary" (click)="onMakePayment()" *ngIf="data.status.toLowerCase() !== 'draft' && data.status.toLowerCase() !== 'paid'">
          <mat-icon>payment</mat-icon>
          Make Payment Now
        </button>
        <!-- Fallback print only for Draft/Unpaid where payment is skipped -->
        <button mat-stroked-button color="primary" (click)="onPrintBill()" *ngIf="data.status.toLowerCase() === 'draft' || data.status.toLowerCase() === 'unpaid'">
          <mat-icon>print</mat-icon>
          Print Bill
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .so-success-dialog {
      padding: 16px 24px;
      background: #ffffff;
      border-radius: 12px;
    }

    .dialog-header {
      text-align: center;
      margin-bottom: 24px;
      padding-top: 8px;
    }

    .success-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #10b981; /* 🎯 Vibrant Emerald */
      margin-bottom: 12px;
      text-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
    }

    h2[mat-dialog-title] {
       margin: 0;
       font-weight: 700;
       color: #1e293b;
       font-size: 1.25rem;
    }

    .so-details {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-row:last-of-type {
      border-bottom: none;
    }

    .detail-row.highlight {
      background: #eff6ff;
      margin: 10px -16px -16px -16px;
      padding: 16px;
      border-radius: 0 0 12px 12px;
      border-top: 1px solid #dbeafe;
    }

    .label {
      font-weight: 500;
      color: #64748b;
      font-size: 0.9rem;
    }

    .value {
      font-weight: 700;
      color: #1e293b;
      font-size: 0.95rem;
    }

    .value.amount {
      font-size: 1.1rem;
      color: #2563eb;
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: #fffbeb;
      border-radius: 10px;
      margin-bottom: 24px;
      border: 1px solid #fef3c7;
    }

    .info-message mat-icon {
      color: #d97706;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .info-message p {
      margin: 0;
      color: #92400e;
      font-weight: 600;
      font-size: 0.9rem;
    }

    mat-dialog-actions {
      padding: 0;
      gap: 12px;
      justify-content: center;
    }

    /* 🎯 PILL-SHAPED EXECUTIVE BUTTONS (Matches Batch Dialog) */
    button[mat-button], button[mat-flat-button], button[mat-stroked-button] {
       height: 48px;
       border-radius: 50px;
       padding: 0 24px;
       font-weight: 700;
       text-transform: uppercase;
       letter-spacing: 0.5px;
       font-size: 0.8rem;
       display: flex;
       align-items: center;
       gap: 8px;
       transition: all 0.3s ease;
    }

    button[mat-flat-button][color="primary"] {
      background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%) !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
      &:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35); }
    }

    button[mat-button] {
       color: #64748b;
       &:hover { background: #f1f5f9; color: #1e293b; }
    }

    /* 🌙 PREMIUM DARK MODE (MIDNIGHT SLATE) */
    :host-context(.dark-mode) {
       .so-success-dialog { background: #1e293b; }
       h2[mat-dialog-title] { color: #ffffff; }

       .so-details {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.05);
          .label { color: rgba(255, 255, 255, 0.5); }
          .value { color: #ffffff; }
          .detail-row { border-bottom-color: rgba(255, 255, 255, 0.05); }
       }

       .detail-row.highlight {
          background: rgba(37, 99, 235, 0.08);
          border-top-color: rgba(37, 99, 235, 0.1);
          .value.amount { color: #60a5fa; }
       }

       .info-message {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.15);
          p { color: #fbbf24; }
          mat-icon { color: #fbbf24; }
       }

       button[mat-button] {
          color: #94a3b8;
          &:hover { background: rgba(255, 255, 255, 0.05); color: #ffffff; }
       }
    }
  `]
})
export class SoSuccessDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<SoSuccessDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SoSuccessData
    ) { }

    onViewList() {
        this.dialogRef.close('view-list');
    }

    onMakePayment() {
        this.dialogRef.close('make-payment');
    }

    onPrintBill() {
        this.dialogRef.close('print-bill');
    }
}
