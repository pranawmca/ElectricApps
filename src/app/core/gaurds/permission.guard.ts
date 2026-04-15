import { Injectable, inject } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { MenuService } from '../services/menu.service';
import { AuthService } from '../services/auth.service';
import { Observable, map, of, catchError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../shared/components/status-dialog-component/status-dialog-component';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
    private router = inject(Router);
    private permissionService = inject(PermissionService);
    private menuService = inject(MenuService);
    private authService = inject(AuthService);
    private dialog = inject(MatDialog);

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        console.log(`[PermissionGuard] Checking access for: ${state.url}`);

        return this.menuService.getMenu().pipe(
            map((menus: any[]) => {
                const companyId = this.authService.getCompanyId();
                const userRole = this.authService.getUserRole();
                const isGlobalAdmin = userRole === 'Admin' || userRole === 'Default Admin' || userRole === 'Super Admin';

                // 🏢 MULTI-TENANT ONBOARDING FLOW
                // If user has no company setup yet, redirect to company creation (unless they are System Admins)
                if (!companyId && !isGlobalAdmin && state.url !== '/app/company/add') {
                    console.warn('[PermissionGuard] No CompanyId found. Redirecting to Onboarding (Company Setup)...');
                    this.router.navigate(['/app/company/add']);
                    return false;
                }

                if (!menus || menus.length === 0) {
                    // If they are on company/add, let them through even with no menus
                    if (state.url === '/app/company/add') {
                        return true;
                    }
                    console.error('[PermissionGuard] No menus loaded. Denying access to:', state.url);
                }

                const hasViewPermission = this.permissionService.checkPermissionWithData(menus as any, state.url, 'CanView');

                console.log(`[PermissionGuard] Access result for ${state.url}:`, hasViewPermission);

                // Always allow access to onboarding/setup page if they have a company being created
                if (hasViewPermission || state.url === '/app/company/add') {
                    return true;
                }

                console.error(`[PermissionGuard] Access Denied to ${state.url}`);

                const errorMessage = (menus && menus.length > 0)
                    ? `Access Denied: You do not have permission to view the requested page (${state.url}).`
                    : 'Access Denied: Your account has no assigned roles or permissions. Please contact your administrator.';

                // Show proper error message using StatusDialogComponent (except for onboarding setup page)
                if (state.url !== '/app/company/add') {
                    this.dialog.open(StatusDialogComponent, {
                        data: {
                            isSuccess: false,
                            message: errorMessage
                        },
                        disableClose: true
                    });
                }

                return false;
            }),
            catchError((err) => {
                console.error('[PermissionGuard] Error checking permissions:', err);
                
                // 🏢 MULTI-TENANT ONBOARDING BYPASS
                // Even if API fails (e.g. 403 No Roles), allow access to setup page
                if (state.url === '/app/company/add') {
                    return of(true);
                }
                
                return of(false);
            })
        );
    }
}
