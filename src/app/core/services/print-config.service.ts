import { Injectable, inject } from '@angular/core';
import { Observable, of, map, switchMap, catchError, forkJoin } from 'rxjs';
import { RoleService } from './role.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PrintConfigService {
    private formatCache: { [pageName: string]: string } = {};

    private roleService = inject(RoleService);
    private authService = inject(AuthService);

    getPrintFormat(pageName: string): Observable<string> {
        if (this.formatCache[pageName]) {
            return of(this.formatCache[pageName]);
        }

        // Standardize pageName mapping for backward compatibility and common typos
        const normalizedPageName = this.normalizePageName(pageName);

        const rolesString = localStorage.getItem('roles');
        let userRoles: string[] = [];
        try {
            const parsed = JSON.parse(rolesString || '[]');
            userRoles = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            userRoles = [this.authService.getUserRole()];
        }
        
        return this.roleService.getAllRoles().pipe(
            switchMap(allAppRoles => {
                // Find IDs for all roles the user has
                const matchedRoleIds = allAppRoles
                    .filter(r => userRoles.some(ur => ur.toLowerCase().trim() === r.roleName.toLowerCase().trim()))
                    .map(r => r.id);

                if (matchedRoleIds.length === 0) {
                    this.formatCache[pageName] = 'A4';
                    return of('A4');
                }

                // If user has multiple roles, fetch settings for all of them and prioritize THERMAL 
                // if any role has it configured for this page.
                const settingsRequests = matchedRoleIds.map(id => this.roleService.getRolePrintSettings(id).pipe(
                    catchError(() => of([]))
                ));

                return forkJoin(settingsRequests).pipe(
                    map((allSettingsResults: any[][]) => {
                        const mergedSettings = allSettingsResults.flat();
                        
                        // Look for the specific page setting. Check with normalized name too.
                        const setting = mergedSettings.find((s: any) => 
                            s.pageName === normalizedPageName || s.pageName === pageName
                        );

                        const format = setting ? setting.printFormat : 'A4';
                        this.formatCache[pageName] = format;
                        return format;
                    })
                );
            }),
            catchError(() => {
                this.formatCache[pageName] = 'A4';
                return of('A4');
            })
        );
    }

    private normalizePageName(name: string): string {
        if (name === 'Quick Sale Invoice') return 'Quick Sale Order';
        if (name === 'Quick Purchase Invoice') return 'Quick Purchase Order';
        return name;
    }
    
    // Auto-detects the page name from the router url if not explicitly provided
    detectPageName(url: string): string {
        if (url.includes('/quick-inventory/purchase/')) return 'Quick Purchase Order';
        if (url.includes('/inventory/polist')) return 'Purchase Order';
        if (url.includes('/quick-inventory/sale/')) return 'Quick Sale Order';
        if (url.includes('/inventory/solist')) return 'Standard Sale Order';
        if (url.includes('/quick-inventory/po-return')) return 'Quick Purchase Return';
        if (url.includes('/inventory/purchase-return')) return 'Purchase Return';
        if (url.includes('/quick-inventory/so-return')) return 'Quick Sale Return';
        if (url.includes('/inventory/sale-return')) return 'Standard Sale Return';
        return 'Standard Sale Order'; // Default wrapper
    }

    clearCache(): void {
        this.formatCache = {};
    }
}
