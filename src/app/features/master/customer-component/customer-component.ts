import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { customerService } from './customer.service';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-customer-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './customer-component.html',
  styleUrl: './customer-component.scss',
})
export class CustomerComponent implements OnInit {

  readonly fb = inject(FormBuilder);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly dialogRef = inject(MatDialogRef<CustomerComponent>, { optional: true });
  readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);

  // ⚠ keeping same service name as you used
  private readonly customerService = inject(customerService);

  isEdit = false;
  loading = false;
  customerId: any = null;

  customerForm = this.fb.group({
    customerName: ['', Validators.required],
    customerType: ['Retail', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    gst: [''],
    creditLimit: [0],
    billingAddress: ['', Validators.required],
    shippingAddress: [''],
    customerStatus: ['Active']
  });

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id') || (this.data && this.data.id);
    console.log('[CustomerComponent] Initializing with ID:', this.customerId);
    if (this.customerId) {
      this.isEdit = true;
      this.loadCustomerData();
    }
  }

  loadCustomerData() {
    this.loading = true;
    this.customerService.getById(this.customerId).subscribe({
      next: (response) => {
        console.log('[CustomerComponent] Received data:', response);
        // Handle potential result wrapping
        const res = (response as any).data || response;

        this.customerForm.patchValue({
          customerName: res.customerName,
          customerType: res.customerType,
          phone: res.phone,
          email: res.email,
          gst: res.gstNumber || res.gst,
          creditLimit: res.creditLimit,
          billingAddress: res.billingAddress,
          shippingAddress: res.shippingAddress,
          customerStatus: res.customerStatus || res.status || 'Active'
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[CustomerComponent] Failed to load customer', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ================= SAVE =================
  onSave() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const currentUserId = localStorage.getItem('email') || '';
    this.loading = true;
    this.cdr.detectChanges();
    const payload = {
      customerName: this.customerForm.value.customerName,
      customerType: this.customerForm.value.customerType,
      phone: this.customerForm.value.phone,
      email: this.customerForm.value.email,
      gstNumber: this.customerForm.value.gst,
      creditLimit: this.customerForm.value.creditLimit,
      billingAddress: this.customerForm.value.billingAddress,
      shippingAddress: this.customerForm.value.shippingAddress,
      customerStatus: this.customerForm.value.customerStatus,
      status: this.customerForm.value.customerStatus, // Map both for safety
      createdBy: this.authService.getUserEmail(),
      modifiedBy: this.authService.getUserEmail(),
      companyId: this.authService.getCompanyId(),
      branchId: this.authService.getBranchId()
    };

    const request = this.isEdit
      ? this.customerService.update(this.customerId, { id: this.customerId, ...payload })
      : this.customerService.addCustomer(payload);

    request.subscribe({
      next: (res: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        if (this.dialogRef) {
          this.dialogRef.close(true);
        } else {
          this.router.navigate(['/app/master/customers']);
        }
      },
      error: (err) => {
        console.error('Customer save failed', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }


  // ================= CANCEL =================
  cancel() {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/app/master/customers']);
    }
  }

}
