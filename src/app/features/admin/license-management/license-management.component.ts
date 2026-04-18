import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { LicenseService, SubscriptionInfo } from '../services/license.service';
import { SummaryStat, SummaryStatsComponent } from '../../../shared/components/summary-stats-component/summary-stats-component';
import { LoadingService } from '../../../core/services/loading.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { AddSubscriptionDialogComponent } from './add-subscription-dialog/add-subscription-dialog.component';

@Component({
  selector: 'app-license-management',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, SummaryStatsComponent],
  templateUrl: './license-management.component.html',
  styleUrls: ['./license-management.component.scss']
})
export class LicenseManagementComponent implements OnInit {
  displayedColumns: string[] = ['customer', 'planType', 'startDate', 'endDate', 'daysRemaining', 'actions'];
  dataSource = new MatTableDataSource<SubscriptionInfo>();
  summaryStats: SummaryStat[] = [];
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private licenseService: LicenseService,
    private loadingService: LoadingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSubscriptions();
  }

  loadSubscriptions(): void {
    this.loading = true;
    this.loadingService.setLoading(true);
    this.licenseService.getAllSubscriptions().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.updateStats(data);
        this.loading = false;
        this.loadingService.setLoading(false);
        setTimeout(() => this.dataSource.paginator = this.paginator);
      },
      error: () => {
        this.loading = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  updateStats(data: SubscriptionInfo[]): void {
    const total = data.length;
    const premium = data.filter(s => s.planType === 'Premium').length;
    const expired = data.filter(s => !s.isActive || s.daysRemaining <= 0).length;

    this.summaryStats = [
      { label: 'Total Customers', value: total, icon: 'people', type: 'total' },
      { label: 'Premium Users', value: premium, icon: 'stars', type: 'active' },
      { label: 'Expired/Due', value: expired, icon: 'event_busy', type: 'warning' }
    ];
  }

  getDaysClass(days: number): string {
    if (days <= 0) return 'status-expired';
    if (days <= 3) return 'status-critical';
    if (days <= 7) return 'status-warning';
    return 'status-active';
  }

  extend(sub: SubscriptionInfo): void {
     const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Extend Trial',
        message: `Extend ${sub.customerName}'s trial by 7 days?`,
        confirmText: 'Extend',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.licenseService.extendSubscription(sub.id, 7).subscribe({
          next: () => {
            this.showStatus(true, 'Trial extended successfully');
            this.loadSubscriptions();
          },
          error: () => this.showStatus(false, 'Failed to extend trial')
        });
      }
    });
  }

  upgrade(sub: SubscriptionInfo): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Upgrade to Premium',
        message: `Manually upgrade ${sub.customerName} to Premium (1 Year)?`,
        confirmText: 'Upgrade',
        confirmColor: 'accent'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.licenseService.makePremium(sub.id).subscribe({
          next: () => {
            this.showStatus(true, 'Upgraded successfully');
            this.loadSubscriptions();
          },
          error: () => this.showStatus(false, 'Failed to upgrade')
        });
      }
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AddSubscriptionDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'onboarding-wizard-panel',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showStatus(true, 'Customer onboarded successfully!');
        this.loadSubscriptions();
      }
    });
  }

  private showStatus(success: boolean, message: string): void {
    this.dialog.open(StatusDialogComponent, {
      data: { isSuccess: success, message: message }
    });
  }
}
