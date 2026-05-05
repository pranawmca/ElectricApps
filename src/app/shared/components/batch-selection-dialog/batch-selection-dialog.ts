import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material/material-module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-batch-selection-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  template: `
    <div class="batch-selection-container">
      <div class="dialog-header">
        <div class="header-content">
          <h2 class="title">Select Batch — {{ data.productName }}</h2>
          <p class="subtitle" *ngIf="data.validCount > 0">
            <span style="color: #10b981; font-weight: 700;">{{data.validCount}} valid batch{{data.validCount > 1 ? 'es' : ''}} available</span>
            <span *ngIf="getUnselectableCount() > 0" style="color: #ef4444; margin-left: 8px; font-weight: 700;">
              &bull; {{getUnselectableCount()}} unavailable
            </span>
          </p>
          <p class="subtitle" *ngIf="!data.validCount || data.validCount === 0" style="color: #dc2626; font-weight: 700;">
            ⚠️ No selectable batches available.
          </p>
        </div>
        <button mat-icon-button class="close-icon-btn" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="batches-list">
        <div class="batch-card" 
             *ngFor="let batch of data.batches; let i = index"
             [class.selected]="selectedBatchIndex === i"
             [class.disabled]="isDisabled(batch)"
             [class.near-expiry]="isNearExpiry(batch)"
             (click)="!isDisabled(batch) && selectBatch(i)">
          
          <div class="batch-header">
            <div class="batch-number">
              <mat-icon class="batch-icon">inventory_2</mat-icon>
              <span class="label">{{ batch.batchNumber || batch.BatchNumber || ('Batch ' + (i + 1)) }}</span>
            </div>
            <mat-radio-button [checked]="selectedBatchIndex === i"></mat-radio-button>
          </div>

          <div class="batch-details">
            <div class="detail-row" *ngIf="batch.referenceNumber || batch.ReferenceNumber">
              <span class="label">Bill/PO No:</span>
              <span class="value ref">{{ batch.referenceNumber || batch.ReferenceNumber }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Warehouse:</span>
              <span class="value warehouse">{{ batch.warehouseName || batch.WarehouseName || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Rack:</span>
              <span class="value rack">{{ batch.rackName || batch.RackName || 'N/A' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Mfg Date:</span>
              <span class="value date" [class.expired]="isMfgExpired(batch)">
                {{ formatDate(batch.manufacturingDate || batch.ManufacturingDate) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Exp Date:</span>
              <span class="value date" [class.expired]="isExpired(batch)">
                {{ formatDate(batch.expiryDate || batch.ExpiryDate) }} 
                <span *ngIf="isExpired(batch)" style="font-size: 0.7rem; display: block; line-height: 1;">(Expired)</span>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Stock:</span>
              <span class="value stock" [class.low]="(batch.availableStock || batch.AvailableStock || 0) <= 5">
                {{ batch.availableStock || batch.AvailableStock || 0 }} {{ batch.unit || 'PCS' }}
              </span>
            </div>
          </div>

          <div class="batch-expiry-warning" *ngIf="isExpired(batch)">
            <mat-icon class="warning-icon">warning</mat-icon>
            <span class="warning-text">Expired</span>
          </div>
          <div class="batch-expiry-warning" *ngIf="!isExpired(batch) && (batch.availableStock || batch.AvailableStock || 0) <= 0">
            <mat-icon class="warning-icon">block</mat-icon>
            <span class="warning-text">Out of Stock</span>
          </div>
          <div class="batch-low-stock-warning" *ngIf="!isExpired(batch) && (batch.availableStock || batch.AvailableStock || 0) <= 5 && (batch.availableStock || batch.AvailableStock || 0) > 0">
            <mat-icon class="warning-icon">info</mat-icon>
            <span class="warning-text">Low Stock</span>
          </div>
          <div class="batch-priority-badge" *ngIf="isNearExpiry(batch) && !isExpired(batch)">
            <mat-icon class="warning-icon">priority_high</mat-icon>
            <span class="warning-text">Sell First (Near Expiry)</span>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button mat-raised-button class="dg-pill-cancel" (click)="close()">
          <mat-icon>close</mat-icon> CANCEL
        </button>
        <button mat-raised-button class="dg-pill-confirm" (click)="confirm()" 
                [disabled]="selectedBatchIndex === null || (selectedBatchIndex !== null && isDisabled(data.batches[selectedBatchIndex]))">
          <mat-icon>shopping_cart</mat-icon> ADD SELECTED BATCH
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: var(--card-bg, #ffffff);
      color: var(--app-text, #1e293b);
      overflow: hidden;
      border-radius: 16px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
    }

    .batch-selection-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: var(--card-bg, #ffffff);
      position: relative;
    }

    .dialog-header {
      padding: 24px 28px;
      background: var(--header-bg, linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%));
      border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
      position: relative;
      z-index: 10;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .header-content { flex: 1; }

      .title {
        margin: 0 0 6px 0;
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--app-text, #1e293b);
        letter-spacing: -0.8px;
        font-family: 'Outfit', sans-serif;
      }

      .subtitle {
        margin: 0;
        font-size: 0.85rem;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
      }

      .close-icon-btn {
        width: 36px;
        height: 36px;
        line-height: 36px;
        background: rgba(244, 63, 94, 0.1);
        color: #f43f5e;
        border-radius: 50%;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(244, 63, 94, 0.2);
        padding: 0 !important;
        margin-top: -4px;
        margin-right: -4px;

        .mat-icon {
          margin: 0 !important;
          padding: 0 !important;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        &:hover { 
          color: white; 
          background: #f43f5e; 
          transform: rotate(90deg) scale(1.1); 
          box-shadow: 0 6px 15px rgba(244, 63, 94, 0.4);
        }
      }
    }

    .batches-list {
      display: block !important; /* 🎯 Overriding flex for more predictable scrolling */
      height: 420px !important;  /* 🎯 Fixed height to FORCE scroll if content grows */
      overflow-y: scroll !important;
      padding: 16px 24px;
      background: var(--card-bg, #ffffff);
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      
      /* 🚀 ULTIMATE SCROLLBAR VISIBILITY */
      scrollbar-width: thin !important;
      scrollbar-color: rgba(var(--dg-primary-theme-rgb, 37, 99, 235), 0.6) rgba(0, 0, 0, 0.05) !important;
      
      &::-webkit-scrollbar { 
        width: 10px !important;
        display: block !important;
      }
      &::-webkit-scrollbar-track { 
        background: rgba(0, 0, 0, 0.04) !important;
        border-radius: 10px !important;
      }
      &::-webkit-scrollbar-thumb { 
        background: linear-gradient(to bottom, #3b82f6, #1d4ed8) !important;
        border-radius: 10px !important;
        border: 2px solid var(--card-bg, #ffffff) !important;
        &:hover { background: #1d4ed8 !important; }
      }

      .batch-card {
        margin-bottom: 16px; /* 🎯 Manual gap since display isn't flex anymore */
      }
    }

    .batch-card {
      padding: 18px;
      border: 1px solid var(--border-color, rgba(0,0,0,0.06));
      border-radius: 16px;
      background: var(--app-bg, #ffffff);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      box-shadow: 0 4px 6px rgba(0,0,0,0.02);

      &:hover:not(.disabled) {
        border-color: var(--dg-primary-theme, #3b82f6);
        background: var(--card-hover-bg, #f8fafc);
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      }

      &.selected {
        border-color: var(--dg-primary-theme, #3b82f6);
        border-width: 2px;
        background: var(--card-selected-bg, rgba(var(--dg-primary-theme-rgb, 59, 130, 246), 0.04));
        box-shadow: 0 8px 30px rgba(var(--dg-primary-theme-rgb, 59, 130, 246), 0.1);
      }

      &.disabled {
        opacity: 0.45;
        cursor: not-allowed;
        background: rgba(0, 0, 0, 0.02);
        filter: grayscale(0.5);
      }

      .batch-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        .batch-number {
          display: flex;
          align-items: center;
          gap: 12px;

          .batch-icon {
            color: var(--dg-primary-theme, #3b82f6);
            font-size: 22px;
            width: 22px;
            height: 22px;
            filter: drop-shadow(0 2px 4px rgba(var(--dg-primary-theme-rgb, 59, 130, 246), 0.3));
          }

          .label {
            font-weight: 800;
            color: var(--app-text, #1e293b);
            font-size: 1rem;
            letter-spacing: -0.2px;
          }
        }
      }

      .batch-details {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;

          .label {
            color: #64748b;
            font-weight: 600;
          }

          .value {
            color: var(--app-text, #1e293b);
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.03);
            font-family: 'JetBrains Mono', 'Roboto Mono', monospace;

            &.warehouse { color: #0284c7; background: rgba(2, 132, 199, 0.08); }
            &.rack { color: #b45309; background: rgba(180, 83, 9, 0.08); }
            &.date { 
               color: #10b981; background: rgba(16, 185, 129, 0.08); 
               &.expired { color: #ef4444; background: rgba(239, 68, 68, 0.08); }
            }
            &.ref { color: #6366f1; background: rgba(99, 102, 241, 0.08); }
          }
        }
      }

      .batch-expiry-warning,
      .batch-low-stock-warning {
        position: absolute;
        top: 18px;
        right: 56px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.7rem;
        padding: 5px 14px;
        border-radius: 30px;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: 0.8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      }

      .batch-expiry-warning { background: #fee2e2; color: #991b1b; border: 1px solid rgba(153, 27, 27, 0.1); }
      .batch-low-stock-warning { background: #fef3c7; color: #92400e; border: 1px solid rgba(146, 64, 14, 0.1); }
      
      .batch-priority-badge { 
        position: absolute;
        top: 18px;
        right: 56px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.7rem;
        padding: 5px 14px;
        border-radius: 30px;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: 0.8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        background: #ecfdf5; 
        color: #047857; 
        border: 1px solid rgba(4, 120, 87, 0.1); 
        animation: pulse-green 2s infinite;
      }

      @keyframes pulse-green {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }

      .batch-card.near-expiry {
        border-color: #10b981;
        background: #f0fdf4;
      }
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      padding: 20px 24px;
      background: var(--header-bg, #ffffff); /* 🎯 Mirroring the Header background */
      border-top: 1px solid var(--border-color, rgba(0,0,0,0.08));
      z-index: 10;

      button {
        min-width: 140px; 
        height: 52px;
        padding: 0 32px !important; 
        border-radius: 50px; 
        font-weight: 800;
        text-transform: uppercase;
        font-size: 0.85rem;
        letter-spacing: 1.2px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        border: none !important;
        font-family: 'Outfit', sans-serif;
      }

      .dg-pill-cancel, .dg-pill-confirm {
        /* 🎯 Unified Stylings for both buttons */
        background: #ffffff !important; 
        color: #475569 !important;
        box-shadow: 0 4px 10px rgba(0,0,0,0.08) !important;
        border: 1px solid rgba(0,0,0,0.1) !important;
        &:hover:not(:disabled) { 
          background: #f8fafc !important;
          transform: translateY(-2px); 
          box-shadow: 0 8px 20px rgba(0,0,0,0.12) !important;
        }
        &:disabled {
          opacity: 0.5;
          filter: grayscale(1);
          box-shadow: none !important;
        }
      }
    }

    /* 🌙 PREMIUM DARK MODE OVERRIDES */
    :host-context(.dark-mode) {
      --header-bg: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      --card-hover-bg: rgba(30, 41, 59, 0.6);
      --card-selected-bg: rgba(59, 130, 246, 0.08);

      .dg-pill-cancel, .dg-pill-confirm {
        background: #1e293b !important; 
        color: #ffffff !important; /* Force white text in dark mode */
        border-color: rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;

        &:hover:not(:disabled) { 
          background: #334155 !important; /* Lighter slate hover for both buttons */
          color: #ffffff !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.6) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
      }
    }
  `]
})
export class BatchSelectionDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<BatchSelectionDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  selectedBatchIndex: number | null = null;

  ngOnInit() {
    // Auto-select first NON-expired batch with stock
    if (this.data.batches && this.data.batches.length > 0) {
      const firstValidIdx = this.data.batches.findIndex((b: any) => !this.isExpired(b) && (b.availableStock || b.AvailableStock || 0) > 0);
      this.selectedBatchIndex = firstValidIdx >= 0 ? firstValidIdx : null;
    }
  }

  selectBatch(index: number) {
    // Prevent selection of disabled batches
    if (index < this.data.batches.length && !this.isDisabled(this.data.batches[index])) {
      this.selectedBatchIndex = index;
    }
  }

  confirm() {
    if (this.selectedBatchIndex !== null && this.selectedBatchIndex < this.data.batches.length) {
      const selectedBatch = this.data.batches[this.selectedBatchIndex];
      // Final check: don't allow disabled batches
      if (this.isDisabled(selectedBatch)) {
        alert('❌ This batch cannot be selected (Expired or No Stock).');
        return;
      }
      this.dialogRef.close(selectedBatch);
    }
  }

  close() {
    this.dialogRef.close(null);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
  }

  isExpired(batch: any): boolean {
    // Use pre-computed flag from parent if available
    if (batch.isExpired !== undefined) return batch.isExpired;
    const expDate = batch.expiryDate || batch.ExpiryDate;
    if (!expDate) return false;
    // Date-only comparison: today ka din bhi expired
    const exp = new Date(expDate);
    exp.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp <= today;
  }
  isMfgExpired(batch: any): boolean {
    const mfgDate = batch.manufacturingDate || batch.ManufacturingDate;
    if (!mfgDate) return false;
    const date = typeof mfgDate === 'string' ? new Date(mfgDate) : new Date(mfgDate);
    // Consider "old" if manufactured more than 2 years ago
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return date < twoYearsAgo;
  }

  isNearExpiry(batch: any): boolean {
    const expDate = batch.expiryDate || batch.ExpiryDate;
    if (!expDate) return false;
    const exp = new Date(expDate);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30; // Within 30 days
  }

  isDisabled(batch: any): boolean {
    const stock = batch.availableStock || batch.AvailableStock || 0;
    return this.isExpired(batch) || stock <= 0;
  }

  getUnselectableCount(): number {
    if (!this.data.batches) return 0;
    return this.data.batches.filter((b: any) => this.isDisabled(b)).length;
  }
}
