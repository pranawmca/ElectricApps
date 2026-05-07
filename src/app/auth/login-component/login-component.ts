import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/material/material/material-module';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoginDto } from '../../core/models/user.model';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../shared/components/status-dialog-component/status-dialog-component';
import { PermissionService } from '../../core/services/permission.service';
import { CompanyService } from '../../features/company/services/company.service';
import { LoadingService } from '../../core/services/loading.service';
import { BranchSelectionDialogComponent } from '../../shared/components/branch-selection-dialog/branch-selection-dialog.component';
import { IdleService } from '../../core/services/idle.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss',
})
export class LoginComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  public cdr = inject(ChangeDetectorRef);
  private titleService = inject(Title);
  private dialog = inject(MatDialog);
  private permissionService = inject(PermissionService);
  private companyService = inject(CompanyService);
  private idleService = inject(IdleService);

  @ViewChild('emailInputField') emailInputField!: ElementRef;

  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;
  resetPasswordForm!: FormGroup;
  changePasswordForm!: FormGroup;

  private loadingService = inject(LoadingService);
  loading = false;
  errorMessage = '';
  forgotPasswordMode = false;
  resetPasswordMode = false;
  changePasswordMode = false;

  welcomeMessage = 'Welcome Back';
  companyName = 'Electric ERP';
  companyTagline = 'Powering Your Business Excellence';

  ngOnInit() {
    this.titleService.setTitle('Login - Electric ERP');
    this.initForms();
    this.loadRememberedData();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.emailInputField) {
        this.emailInputField.nativeElement.focus();
      }
    }, 500);
  }

  private initForms() {
    this.loginForm = this.fb.group({
      CompanyCode: ['', Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Password: ['', Validators.required],
      rememberMe: [false]
    });

    this.forgotPasswordForm = this.fb.group({
      Email: ['', [Validators.required, Validators.email]]
    });

    this.resetPasswordForm = this.fb.group({
      Email: ['', [Validators.required, Validators.email]],
      ResetToken: ['', Validators.required],
      NewPassword: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.changePasswordForm = this.fb.group({
      Email: ['', [Validators.required, Validators.email]],
      OldPassword: ['', Validators.required],
      NewPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private loadRememberedData() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const lastCompanyCode = localStorage.getItem('lastCompanyCode');
    
    if (rememberedEmail || lastCompanyCode) {
      this.loginForm.patchValue({
        Email: rememberedEmail || '',
        CompanyCode: lastCompanyCode || '',
        rememberMe: !!rememberedEmail
      });
    }
  }

  toggleChangePasswordMode() {
    this.changePasswordMode = !this.changePasswordMode;
    this.errorMessage = '';
    this.loginForm.reset();
    this.changePasswordForm.reset();
    this.loadRememberedData();
  }

  Login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const loginData: LoginDto = {
      CompanyCode: this.loginForm.value.CompanyCode,
      Email: this.loginForm.value.Email,
      Password: this.loginForm.value.Password
    };

    this.auth.login(loginData).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res) => {
        if (this.loginForm.value.rememberMe) {
          localStorage.setItem('rememberedEmail', this.loginForm.value.Email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        localStorage.setItem('lastCompanyCode', this.loginForm.value.CompanyCode);
        this.permissionService.resetForLogin();
        this.idleService.startWatching();

        if (this.auth.isSubscriptionExpired()) {
          this.router.navigate(['/subscribe']);
          return;
        }

        // 🚀 BYPASS BRANCH SELECTION POPUP
        this.loadingService.setLoading(true);
        this.cdr.detectChanges();

        const assignedBranchId = this.auth.getBranchId();
        const companyId = res.companyId || this.auth.getCompanyId();

        if (assignedBranchId && companyId) {
          // Fetch branch name to show correct name in toolbar
          this.companyService.getBranchesByCompany(companyId).subscribe({
            next: (branches) => {
              this.loadingService.setLoading(false);
              console.log('--- LOGIN: Branches found:', branches);
              console.log('--- LOGIN: Looking for assignedBranchId:', assignedBranchId);
              
              // Robust lookup: handle string vs number comparison
              const branch = branches.find(b => 
                b.id.toString() === assignedBranchId.toString() || 
                b.BranchId?.toString() === assignedBranchId.toString()
              );
              
              if (branch) {
                console.log('--- LOGIN: Found branch name:', branch.branchName);
                this.auth.setWorkingBranch(assignedBranchId, branch.branchName);
              } else {
                console.warn('--- LOGIN: Branch name not found in list, using fallback.');
                this.auth.setWorkingBranch(assignedBranchId, 'Main Office'); // Default fallback for now
              }
              
              this.router.navigate(['/app/dashboard']);
              this.cdr.detectChanges();
            },
            error: () => {
              this.loadingService.setLoading(false);
              this.auth.setWorkingBranch(assignedBranchId, 'Assigned Branch');
              this.router.navigate(['/app/dashboard']);
              this.cdr.detectChanges();
            }
          });
        } else {
          // Global User (Super Admin)
          setTimeout(() => {
            this.loadingService.setLoading(false);
            this.router.navigate(['/app/dashboard']);
            this.cdr.detectChanges();
          }, 1000);
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        const msg = err?.error?.message || 'Invalid credentials or server error.';
        setTimeout(() => { this.showErrorDialog(msg); }, 150);
      }
    });
  }

  ChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const data = this.changePasswordForm.value;

    this.auth.changePassword(data).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.dialog.open(StatusDialogComponent, {
          data: { isSuccess: true, message: 'Password changed successfully. Please login.' }
        });
        this.toggleChangePasswordMode();
      },
      error: err => {
        const msg = err?.error?.message || 'Failed to change password.';
        setTimeout(() => {
          this.showErrorDialog(msg);
        }, 150);
      }
    });
  }

  private showErrorDialog(message: string) {
    this.dialog.open(StatusDialogComponent, {
      data: { isSuccess: false, message: message },
      disableClose: true
    });
  }

  toggleForgotPasswordMode() {
    this.forgotPasswordMode = !this.forgotPasswordMode;
    this.resetPasswordMode = false;
    this.changePasswordMode = false;
    this.errorMessage = '';
    this.forgotPasswordForm.reset();
    this.resetPasswordForm.reset();
  }

  onForgotPassword() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const email = this.forgotPasswordForm.value.Email;

    this.auth.forgotPassword(email).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res) => {
        if (res.token) {
          this.dialog.open(StatusDialogComponent, {
            data: { isSuccess: true, message: `Token generated (Dev Mode): ${res.token}` }
          });
          this.resetPasswordForm.patchValue({
            Email: email,
            ResetToken: res.token
          });
        } else {
          this.dialog.open(StatusDialogComponent, {
            data: { isSuccess: true, message: 'If the email exists, a reset link has been sent.' }
          });
        }

        this.forgotPasswordMode = false;
        this.resetPasswordMode = true;
      },
      error: err => {
        console.error('Forgot Password Error:', err);
        let msg = 'Failed to request password reset.';

        if (err.error) {
          if (typeof err.error === 'string') {
            msg = err.error;
          } else if (err.error.errors) {
            const errors = err.error.errors;
            const firstError = Object.keys(errors)[0];
            msg = errors[firstError][0] || 'Validation error';
          } else if (err.error.title) {
            msg = err.error.title;
          } else if (err.error.message) {
            msg = err.error.message;
          }
        }

        setTimeout(() => { this.showErrorDialog(msg); }, 150);
      }
    });
  }

  onResetPassword() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const data = this.resetPasswordForm.value;

    this.auth.resetPassword(data).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        const userEmail = this.resetPasswordForm.value.Email;
        this.dialog.open(StatusDialogComponent, {
          data: { isSuccess: true, message: 'Password reset successfully. Please login.' }
        });
        this.resetPasswordMode = false;
        this.forgotPasswordMode = false;

        this.loginForm.reset({
          Email: userEmail,
          Password: '',
          CompanyCode: localStorage.getItem('lastCompanyCode') || '',
          rememberMe: this.loginForm.value.rememberMe
        });

        setTimeout(() => {
          if (this.emailInputField) {
            this.emailInputField.nativeElement.focus();
          }
        }, 500);
      },
      error: err => {
        console.error('Reset Password Error:', err);
        let msg = 'Failed to reset password.';
        if (err.error && typeof err.error === 'string') {
          msg = err.error;
        } else if (err.error?.message) {
          msg = err.error.message;
        }
        setTimeout(() => { this.showErrorDialog(msg); }, 150);
      }
    });
  }

  cancelReset() {
    this.resetPasswordMode = false;
    this.forgotPasswordMode = false;
  }
}
