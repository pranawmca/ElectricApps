import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatDatepickerModule, 
    MatNativeDateModule,
    MatDividerModule,
    RouterLink
  ],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss'
})
export class EmployeeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  employeeForm!: FormGroup;
  isEditMode = false;
  imagePreview: string | null = null;

  departments = ['IT', 'HR', 'Finance', 'Operations', 'Sales', 'Marketing'];
  designations = ['Junior Developer', 'Senior Developer', 'Team Lead', 'Manager', 'HR Executive', 'Accountant'];
  statusOptions = ['Active', 'Inactive', 'Terminated', 'On Leave'];

  ngOnInit(): void {
    this.initForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.loadEmployeeData(id);
    }
  }

  initForm(): void {
    this.employeeForm = this.fb.group({
      employeeCode: ['', Validators.required],
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      department: ['', Validators.required],
      designation: ['', Validators.required],
      joiningDate: [new Date(), Validators.required],
      basicSalary: [0, [Validators.required, Validators.min(0)]],
      status: ['Active', Validators.required],
      address: ['']
    });
  }

  loadEmployeeData(id: string): void {
    // Mock loading data
    this.employeeForm.patchValue({
      employeeCode: 'EMP' + id,
      fullName: 'Employee ' + id,
      email: 'employee' + id + '@example.com',
      phone: '1234567890',
      department: 'IT',
      designation: 'Senior Developer',
      joiningDate: new Date(),
      basicSalary: 50000,
      status: 'Active',
      address: 'Test Address'
    });
    this.imagePreview = `https://i.pravatar.cc/150?u=${id}`;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.employeeForm.valid) {
      console.log('Employee Data:', this.employeeForm.value);
      // Logic to save data to backend would go here
      this.router.navigate(['/app/employee-payroll/employees']);
    }
  }
}
