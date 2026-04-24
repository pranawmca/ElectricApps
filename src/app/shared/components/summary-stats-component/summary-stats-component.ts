import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material/material/material-module';

export interface SummaryStat {
    label: string;
    value: string | number;
    icon: string;
    type: 'total' | 'active' | 'overdue' | 'info' | 'success' | 'warning' | 'danger';
    badge?: string;
}

@Component({
    selector: 'app-summary-stats',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    templateUrl: './summary-stats-component.html',
    styleUrl: './summary-stats-component.scss'
})
export class SummaryStatsComponent {
    @Input() stats: SummaryStat[] = [];
    @Input() isLoading: boolean = false;
}
