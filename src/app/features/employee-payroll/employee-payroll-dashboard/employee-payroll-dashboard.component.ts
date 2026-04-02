import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';

@Component({
  selector: 'app-employee-payroll-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatGridListModule],
  templateUrl: './employee-payroll-dashboard.component.html',
  styleUrl: './employee-payroll-dashboard.component.scss'
})
export class EmployeePayrollDashboardComponent implements OnInit {
  stats = [
    { label: 'Total Employees', value: '124', icon: 'people', color: '#3b82f6' },
    { label: 'Present Today', value: '112', icon: 'check_circle', color: '#10b981' },
    { label: 'On Leave', value: '8', icon: 'event_busy', color: '#f59e0b' },
    { label: 'Pending Approvals', value: '5', icon: 'pending_actions', color: '#ef4444' }
  ];

  recentActivities = [
    { title: 'Attendance Marked', desc: 'John Doe checked in at 09:05 AM', time: '10 mins ago', type: 'attendance' },
    { title: 'Leave Applied', desc: 'Sarah Smith applied for Casual Leave', time: '2 hours ago', type: 'leave' },
    { title: 'Salary Generated', desc: 'March 2026 payroll has been processed', time: '1 day ago', type: 'payroll' }
  ];

  constructor() {}

  ngOnInit(): void {}
}
