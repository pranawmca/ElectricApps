import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';

export interface GrnSuccessData {
    grnNumber: string;
    grandTotal: number;
    supplierId: number;
    supplierName: string;
}

@Component({
    selector: 'app-grn-success-dialog',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    template: `
    <div class="grn-success-dialog">
      <div class="dialog-header">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <h2 mat-dialog-title>GRN Saved Successfully!</h2>
      </div>

      <mat-dialog-content>
        <div class="grn-details">
          <div class="detail-row">
            <span class="label">GRN Number:</span>
            <span class="value">{{ data.grnNumber }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Supplier:</span>
            <span class="value">{{ data.supplierName }}</span>
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
          View GRN List
        </button>
        <button mat-button class="print-btn" (click)="onPrint()">
          <mat-icon>print</mat-icon>
          Print GRN
        </button>
        <button mat-flat-button color="primary" (click)="onMakePayment()">
          <mat-icon>payment</mat-icon>
          Make Payment Now
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .grn-success-dialog {
      padding: 16px;
      background: #ffffff;
      transition: all 0.3s ease;
    }

    .dialog-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .success-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #22c55e;
      margin-bottom: 12px;
    }

    h2[mat-dialog-title] {
      margin: 0;
      font-weight: 700;
      color: #1e293b;
      font-size: 1.5rem;
    }

    .grn-details {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 8px 16px;
      margin-bottom: 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-row.highlight {
      background: #fffbeb;
      margin: 4px -16px -8px -16px;
      padding: 16px;
      border-radius: 0 0 12px 12px;
      border-top: 1px solid #fef3c7;
    }

    .label {
      font-weight: 500;
      color: #64748b;
      font-size: 0.95rem;
    }

    .value {
      font-weight: 700;
      color: #1e293b;
      font-size: 1rem;
    }

    .value.amount {
      font-size: 1.25rem;
      color: #d97706;
    }

    .info-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 10px;
      margin-bottom: 24px;
    }

    .info-message mat-icon {
      color: #2563eb;
    }

    .info-message p {
      margin: 0;
      color: #1d4ed8;
      font-weight: 600;
      font-size: 0.95rem;
    }

    mat-dialog-actions {
      padding: 0;
      gap: 12px;
    }

    /* 🎯 PILL-SHAPED EXECUTIVE BUTTONS */
    button[mat-button], button[mat-flat-button] {
        height: 48px;
        border-radius: 50px;
        padding: 0 24px !important;
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
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        &:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4); }
    }

    /* 🌙 PREMIUM DARK MODE (MIDNIGHT SLATE) */
    :host-context(.dark-mode) {
       .grn-success-dialog { background: #1e293b; }
       h2[mat-dialog-title] { color: #ffffff !important; }

       .grn-details {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.05);
          .label { color: rgba(255, 255, 255, 0.7); } /* 🎯 Brighter labels */
          .value { color: #ffffff; }
          .detail-row { border-bottom-color: rgba(255, 255, 255, 0.05); }
       }

       .detail-row.highlight {
          background: rgba(30, 64, 175, 0.15); /* 🎯 Sapphire Glow */
          border-top-color: rgba(30, 64, 175, 0.2);
          .value.amount { color: #38bdf8; text-shadow: 0 0 15px rgba(56, 189, 248, 0.3); }
       }

       .info-message {
          background: rgba(37, 99, 235, 0.1);
          border-color: rgba(37, 99, 235, 0.15);
          p { color: #ffffff !important; }
          mat-icon { color: #60a5fa; }
       }

       button[mat-button] {
          background: #1e293b !important; /* Opaque Slate for Proper visibility */
          color: #ffffff !important;
          &:hover { background: #334155 !important; color: #ffffff !important; }
       }

       button[mat-flat-button][color="primary"] {
           /* 🎯 ULTIMATE DARK POLISHED SAPPHIRE ACTION (EXECUTIVE GLOSS) */
           background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
           box-shadow: 0 8px 30px rgba(30, 64, 175, 0.45) !important;
           border: 1px solid rgba(255, 255, 255, 0.1) !important;
           color: #ffffff !important;
           
           &:hover:not(:disabled) { 
               background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important;
               box-shadow: 0 12px 45px rgba(37, 99, 235, 0.55) !important;
               transform: translateY(-2px) scale(1.02);
           }

           &:active:not(:disabled) {
               transform: translateY(1px);
           }
       }
    }
  `]
})
export class GrnSuccessDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<GrnSuccessDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: GrnSuccessData
    ) { }

    onViewList() {
        this.dialogRef.close('view-list');
    }

    onMakePayment() {
        this.dialogRef.close('make-payment');
    }

    onPrint() {
        this.dialogRef.close('print');
    }
}
