import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material/material-module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-branch-selection-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="branch-dialog-container">
      <div class="dialog-header">
        <mat-icon class="header-icon">account_balance</mat-icon>
        <h2>Select Working Branch</h2>
        <p>Choose a branch to continue to your dashboard</p>
      </div>

      <div mat-dialog-content class="branch-list">
        <button mat-button *ngFor="let branch of data.branches" 
                (click)="selectBranch(branch)" 
                class="branch-item">
          <div class="branch-info">
            <mat-icon>location_on</mat-icon>
            <div class="text">
              <span class="name">{{ branch.branchName || 'Main Branch' }}</span>
              <span class="addr">{{ branch.addressLine1 }}</span>
            </div>
          </div>
          <mat-icon class="arrow">chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .branch-dialog-container {
      padding: 24px;
      background: #f8fafc;
    }
    .dialog-header {
      text-align: center;
      margin-bottom: 24px;
      .header-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #3b82f6;
        margin-bottom: 12px;
      }
      h2 { margin: 0; font-weight: 800; color: #1e293b; }
      p { margin: 4px 0 0; color: #64748b; font-size: 14px; }
    }
    .branch-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }
    .branch-item {
      width: 100% !important;
      height: auto !important;
      padding: 16px !important;
      text-align: left !important;
      background: white !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      transition: all 0.2s ease !important;

      &:hover {
        border-color: #3b82f6 !important;
        background: #eff6ff !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
      }

      .branch-info {
        display: flex;
        align-items: center;
        gap: 16px;
        mat-icon { color: #3b82f6; }
        .text {
          display: flex;
          flex-direction: column;
          .name { font-weight: 700; color: #1e293b; font-size: 16px; }
          .addr { font-size: 12px; color: #64748b; }
        }
      }
      .arrow { color: #cbd5e1; }
    }
  `]
})
export class BranchSelectionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BranchSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { branches: any[] }
  ) {}

  selectBranch(branch: any) {
    this.dialogRef.close(branch);
  }
}
