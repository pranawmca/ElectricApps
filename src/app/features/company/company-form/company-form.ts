import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Validators, FormBuilder, FormGroup, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { merge } from 'rxjs';

import { CompanyService } from '../services/company.service';
import { CompanyProfileDto, UpsertCompanyRequest } from '../model/company.model';
import { FormFooter } from '../../shared/form-footer/form-footer';
import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { environment } from '../../../enviornments/environment';
import { LoadingService } from '../../../core/services/loading.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-company-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MaterialModule, FormFooter],
    templateUrl: './company-form.html',
    styleUrl: './company-form.scss',
})
export class CompanyForm implements OnInit {
    private fb = inject(FormBuilder);
    private dialog = inject(MatDialog);
    private cdr = inject(ChangeDetectorRef);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private companyService = inject(CompanyService);
    private loadingService = inject(LoadingService);
    private authService = inject(AuthService);

    companyForm!: FormGroup;
    loading = false;
    companyId: string | null = null;
    selectedLogo: File | null = null;
    logoPreview: string | null = null;

    ngOnInit(): void {
        this.createForm();
        this.setupDisclaimerSync();
        this.route.paramMap.subscribe(params => {
            this.companyId = params.get('id');
            this.resetImageStates();
            if (this.companyId) {
                this.loadCompany();
            } else {
                this.companyForm.reset({
                    isActive: true,
                    saleReturnWindowValue: 72,
                    saleReturnWindowUnit: 'Hours',
                    saleReturnPolicyDisclaimer: '',
                    purchaseReturnWindowValue: 72,
                    purchaseReturnWindowUnit: 'Hours',
                    purchaseReturnPolicyDisclaimer: '',
                    invoiceFooterMessage: '',
                    estimateFooterMessage: '',
                    purchaseOrderFooterMessage: '',
                    saleOrderFooterMessage: '',
                    bankInfo: { id: '', accountType: 'Current' }
                });
                this.signatories.clear();
            }
        });
    }

    private setupDisclaimerSync() {
        // Sale Return Sync
        merge(
            this.companyForm.get('saleReturnWindowValue')!.valueChanges,
            this.companyForm.get('saleReturnWindowUnit')!.valueChanges
        ).subscribe(() => {
            const val = this.companyForm.get('saleReturnWindowValue')?.value;
            const unit = this.companyForm.get('saleReturnWindowUnit')?.value;
            if (val && unit) {
                this.companyForm.get('saleReturnPolicyDisclaimer')?.setValue(
                    `As per company policy, items received more than ${val} ${unit.toLowerCase()} ago are blocked for return. Please ensure returns are processed within this window.`,
                    { emitEvent: false }
                );
            }
        });

        // Purchase Return Sync
        merge(
            this.companyForm.get('purchaseReturnWindowValue')!.valueChanges,
            this.companyForm.get('purchaseReturnWindowUnit')!.valueChanges
        ).subscribe(() => {
            const val = this.companyForm.get('purchaseReturnWindowValue')?.value;
            const unit = this.companyForm.get('purchaseReturnWindowUnit')?.value;
            if (val && unit) {
                this.companyForm.get('purchaseReturnPolicyDisclaimer')?.setValue(
                    `As per company policy, items received more than ${val} ${unit.toLowerCase()} ago are blocked for return. Please ensure returns are processed within this window.`,
                    { emitEvent: false }
                );
            }
        });
    }

    private resetImageStates() {
        this.selectedLogo = null;
        this.logoPreview = null;
        this.cdr.detectChanges();
    }

    createForm() {
        this.companyForm = this.fb.group({
            name: ['', Validators.required],
            companyCode: ['', Validators.required],
            tagline: [''],
            registrationNumber: ['', Validators.required],
            gstin: ['', [Validators.required, Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]],
            logoUrl: [''],
            primaryEmail: ['', [Validators.required, Validators.email]],
            email: ['', [Validators.email]],
            primaryPhone: ['', [Validators.required]],
            website: [''],
            message: [''],
            driverWhatsAppMessage: [''],
            purchaseOrderCreationMessage: [''],
            purchaseOrderStatusUpdateMessage: [''],
            saleOrderCreationMessage: [''],
            saleOrderConfirmationMessage: [''],
            smtpEmail: ['', [Validators.email]],
            smtpPassword: [''],
            smtpHost: [''],
            smtpPort: [587],
            smtpUseSsl: [true],
            isActive: [true],
            saleReturnWindowValue: [72, Validators.required],
            saleReturnWindowUnit: ['Hours', Validators.required],
            saleReturnPolicyDisclaimer: [''],
            purchaseReturnWindowValue: [72, Validators.required],
            purchaseReturnWindowUnit: ['Hours', Validators.required],
            purchaseReturnPolicyDisclaimer: [''],
            invoiceFooterMessage: [''],
            estimateFooterMessage: [''],
            purchaseOrderFooterMessage: [''],
            saleOrderFooterMessage: [''],

            // Branches (Addresses) FormArray
            addresses: this.fb.array([]),

            // Bank Info Nested Group
            bankInfo: this.fb.group({
                id: [''],
                bankName: ['', Validators.required],
                branchName: [''],
                accountNumber: ['', Validators.required],
                ifscCode: ['', [Validators.required, Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')]],
                accountType: ['Current', Validators.required]
            }),

            // Authorized Signatories FormArray
            authorizedSignatories: this.fb.array([])
        });
        
        // Initial Branch if empty
        if (!this.companyId) {
            this.addBranch();
        }
        this.cdr.detectChanges();
    }

    get branches(): FormArray {
        return this.companyForm.get('addresses') as FormArray;
    }

    addBranch(data: any = null) {
        const branchForm = this.fb.group({
            id: [data?.id || ''],
            branchName: [data?.branchName || 'Head Office', Validators.required],
            addressLine1: [data?.addressLine1 || '', Validators.required],
            addressLine2: [data?.addressLine2 || ''],
            city: [data?.city || '', Validators.required],
            state: [data?.state || '', Validators.required],
            stateCode: [data?.stateCode || '', [Validators.required, Validators.maxLength(2)]],
            pinCode: [data?.pinCode || '', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
            country: [data?.country || 'India', Validators.required],
            email: [data?.email || '', [Validators.email]],
            phone: [data?.phone || ''],
            contactPerson: [data?.contactPerson || ''],
            gstin: [data?.gstin || ''],
            isHeadOffice: [data?.isHeadOffice || false]
        });
        this.branches.push(branchForm);
        this.cdr.detectChanges();
    }

    removeBranch(index: number) {
        if (this.branches.length > 1) {
            this.branches.removeAt(index);
        }
    }

    get signatories(): FormArray {
        return this.companyForm.get('authorizedSignatories') as FormArray;
    }

    addSignatory() {
        const sigForm = this.fb.group({
            id: [''],
            personName: ['', Validators.required],
            designation: ['', Validators.required],
            email: ['', [Validators.email]],
            signatureImageUrl: [''],
            isDefault: [false]
        });
        this.signatories.push(sigForm);
        this.cdr.detectChanges();
    }

    removeSignatory(index: number) {
        this.signatories.removeAt(index);
    }

    loadCompany() {
        if (!this.companyId) return;
        this.loading = true;
        this.loadingService.setLoading(true);
        this.companyService.getById(this.companyId).subscribe({
            next: (res) => {
                // Reset form to base state before patching
                this.companyForm.reset({
                    isActive: true,
                    saleReturnWindowValue: 72,
                    saleReturnWindowUnit: 'Hours',
                    saleReturnPolicyDisclaimer: '',
                    purchaseReturnWindowValue: 72,
                    purchaseReturnWindowUnit: 'Hours',
                    purchaseReturnPolicyDisclaimer: '',
                    invoiceFooterMessage: '',
                    estimateFooterMessage: '',
                    purchaseOrderFooterMessage: '',
                    saleOrderFooterMessage: '',
                    bankInfo: { id: 0, accountType: 'Current' }
                });

                // Clear and Re-populate Branches
                this.branches.clear();
                let branches = res.addresses || [];
                
                // Legacy Fallback: If no branches but a single address exists
                if (branches.length === 0 && (res as any).address) {
                    const legacyAddr = (res as any).address;
                    branches = [{
                        id: legacyAddr.id || '',
                        branchName: 'Head Office',
                        addressLine1: legacyAddr.addressLine1 || '',
                        addressLine2: legacyAddr.addressLine2 || '',
                        city: legacyAddr.city || '',
                        state: legacyAddr.state || '',
                        stateCode: legacyAddr.stateCode || '',
                        pinCode: legacyAddr.pinCode || '',
                        country: legacyAddr.country || 'India',
                        isHeadOffice: true
                    }];
                }
                
                branches.forEach(b => this.addBranch(b));

                // Clear and Re-populate Signatories
                this.signatories.clear();
                const sigs = res.authorizedSignatories || [];
                sigs.forEach(sig => {
                    this.signatories.push(this.fb.group({
                        id: [sig.id],
                        personName: [sig.personName, Validators.required],
                        designation: [sig.designation, Validators.required],
                        email: [sig.email, [Validators.email]],
                        signatureImageUrl: [sig.signatureImageUrl],
                        isDefault: [sig.isDefault]
                    }));
                });

                // Patch the rest of the form
                this.companyForm.patchValue({
                    ...res,
                    companyCode: res.companyCode,
                    email: res.email
                });

                // Ensure logo state is synced
                this.logoPreview = null;

                this.loading = false;
                this.loadingService.setLoading(false);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading company:', err);
                this.loading = false;
                this.loadingService.setLoading(false);
                this.cdr.detectChanges();
            }
        });
    }

    onSave(): void {
        if (this.companyForm.invalid) {
            console.error('Form Validation Errors:', this.getFormValidationErrors());
            this.companyForm.markAllAsTouched();
            return;
        }

        const isAddMode = !this.companyId;
        const action = isAddMode ? 'Create' : 'Update';
        
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: `Confirm ${action}`,
                message: `Are you sure you want to ${action.toLowerCase()} this company?`
            }
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (!confirm) return;

            this.loading = true;
            this.loadingService.setLoading(true);
            const formData = this.companyForm.value;

            if (isAddMode) {
                // In Add Mode, we always want a clean insert.
                // If it's a "Self-Service" setup (no companyId in token), we trigger setupTenant.
                // Otherwise (Admin adding a company), we just call saveCompanyDetails with no companyId.

                if (!this.authService.getCompanyId()) {
                    this.companyService.setupTenant(formData.name).subscribe({
                        next: (setupRes) => {
                            formData.companyId = setupRes.companyId;
                            this.saveCompanyDetails(formData);
                        },
                        error: (err) => this.handleError(err)
                    });
                } else {
                    // Admin is adding a NEW company. Ensure companyId is null to trigger a fresh insert.
                    formData.companyId = null;
                    this.saveCompanyDetails(formData);
                }
            } else {
                // Edit Mode: Update existing companyId
                formData.companyId = this.companyId;
                this.saveCompanyDetails(formData);
            }
        });
    }

    private saveCompanyDetails(formData: any) {
        // Explicit Payload construction with safe defaults to avoid 400 Bad Request
        const payload: UpsertCompanyRequest = {
            companyId: formData.companyId || null,
            companyCode: formData.companyCode || '',
            name: formData.name || '',
            tagline: formData.tagline || '',
            registrationNumber: formData.registrationNumber || '',
            gstin: formData.gstin || '',
            logoUrl: formData.logoUrl || null,
            primaryEmail: formData.primaryEmail || '',
            email: formData.email || '',
            smtpEmail: formData.smtpEmail || '',
            smtpPassword: formData.smtpPassword || '',
            smtpHost: formData.smtpHost || '',
            smtpPort: formData.smtpPort || 587,
            smtpUseSsl: !!formData.smtpUseSsl,
            primaryPhone: formData.primaryPhone || '',
            website: formData.website || '',
            message: formData.message || '',
            driverWhatsAppMessage: formData.driverWhatsAppMessage || '',
            purchaseOrderCreationMessage: formData.purchaseOrderCreationMessage || '',
            purchaseOrderStatusUpdateMessage: formData.purchaseOrderStatusUpdateMessage || '',
            saleOrderCreationMessage: formData.saleOrderCreationMessage || '',
            saleOrderConfirmationMessage: formData.saleOrderConfirmationMessage || '',
            saleReturnWindowValue: formData.saleReturnWindowValue || 72,
            saleReturnWindowUnit: formData.saleReturnWindowUnit || 'Hours',
            saleReturnPolicyDisclaimer: formData.saleReturnPolicyDisclaimer || '',
            purchaseReturnWindowValue: formData.purchaseReturnWindowValue || 72,
            purchaseReturnWindowUnit: formData.purchaseReturnWindowUnit || 'Hours',
            purchaseReturnPolicyDisclaimer: formData.purchaseReturnPolicyDisclaimer || '',
            invoiceFooterMessage: formData.invoiceFooterMessage || '',
            estimateFooterMessage: formData.estimateFooterMessage || '',
            purchaseOrderFooterMessage: formData.purchaseOrderFooterMessage || '',
            saleOrderFooterMessage: formData.saleOrderFooterMessage || '',
            addresses: (formData.addresses || []).map((a: any) => ({
                id: a.id || null,
                branchName: a.branchName || 'Head Office',
                addressLine1: a.addressLine1 || '',
                addressLine2: a.addressLine2 || '',
                city: a.city || '',
                state: a.state || '',
                stateCode: a.stateCode || '',
                pinCode: a.pinCode || '',
                country: a.country || 'India',
                email: a.email || '',
                phone: a.phone || '',
                contactPerson: a.contactPerson || '',
                gstin: a.gstin || '',
                isHeadOffice: !!a.isHeadOffice
            })),
            bankInfo: {
                id: (formData.bankInfo && formData.bankInfo.id) || null,
                bankName: (formData.bankInfo && formData.bankInfo.bankName) || '',
                branchName: (formData.bankInfo && formData.bankInfo.branchName) || '',
                accountNumber: (formData.bankInfo && formData.bankInfo.accountNumber) || '',
                ifscCode: (formData.bankInfo && formData.bankInfo.ifscCode) || '',
                accountType: (formData.bankInfo && formData.bankInfo.accountType) || 'Current'
            },
            authorizedSignatories: (formData.authorizedSignatories || []).map((s: any) => ({
                id: s.id || null,
                personName: s.personName || '',
                designation: s.designation || '',
                signatureImageUrl: s.signatureImageUrl || null,
                email: s.email || '',
                isDefault: !!s.isDefault
            }))
        };

        console.log('Sending Company Update Payload:', payload);

        const request = this.companyId
            ? this.companyService.updateCompany(this.companyId, payload)
            : this.companyService.insertCompany(payload);

        request.subscribe({
            next: (res: any) => {
                this.loading = false;
                this.loadingService.setLoading(false);
                this.dialog.open(StatusDialogComponent, {
                    data: {
                        isSuccess: true,
                        message: 'Workspace Setup Successfully! Please logout and login again to activate your session.'
                    }
                }).afterClosed().subscribe(() => {
                    this.router.navigate(['/app/dashboard']);
                });
            },
            error: (err) => this.handleError(err)
        });
    }

    private handleError(err: any) {
        this.loading = false;
        this.loadingService.setLoading(false);
        this.dialog.open(StatusDialogComponent, {
            data: {
                isSuccess: false,
                message: err.error?.message ?? 'Something went wrong during setup'
            }
        });
        this.cdr.detectChanges();
    }

    public onCancel() {
        this.router.navigate(['/app/company']);
    }

    public getImgUrl(url: string | null | undefined): string {
        if (!url) return '';
        if (url.startsWith('data:image') || url.startsWith('http')) {
            return url;
        }
        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        return `${environment.CompanyRootUrl}/${cleanUrl}`;
    }

    public onLogoSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedLogo = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                this.logoPreview = base64;
                this.companyForm.get('logoUrl')?.setValue(base64);
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        }
    }

    public onSignatureSelected(event: any, index: number): void {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.signatories.at(index).get('signatureImageUrl')?.setValue(e.target?.result as string);
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);
        }
    }

    public uploadLogo(id: string): void {
        if (!this.selectedLogo) return;

        this.companyService.uploadLogo(id, this.selectedLogo).subscribe({
            next: (res) => {
                console.log('Logo uploaded successfully', res);
            },
            error: (err) => {
                console.error('Logo upload failed', err);
            }
        });
    }

    private getFormValidationErrors() {
        const errors: any = {};
        const calculateErrors = (group: FormGroup | FormArray, name: string) => {
            Object.keys(group.controls).forEach(key => {
                const control = group.get(key);
                const controlName = name ? `${name}.${key}` : key;
                if (control instanceof FormGroup || control instanceof FormArray) {
                    calculateErrors(control, controlName);
                } else {
                    const controlErrors = control?.errors;
                    if (controlErrors) {
                        errors[controlName] = controlErrors;
                    }
                }
            });
        };
        calculateErrors(this.companyForm, '');
        return errors;
    }

}
