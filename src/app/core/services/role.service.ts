import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../enviornments/environment";
import { Role, RolePermission } from "../models/role.model";
import { ApiService } from "../../shared/api.service";

@Injectable({ providedIn: 'root' })
export class RoleService {
    private api = inject(ApiService);
    private readonly baseUrl = environment.api.identity;

    getAllRoles(): Observable<Role[]> {
        return this.api.get<Role[]>('roles', this.baseUrl);
    }

    getByCompany(companyId: string | null): Observable<Role[]> {
        const id = companyId || 'null';
        return this.api.get<Role[]>(`roles/company/${id}`, this.baseUrl);
    }

    getRoleById(id: string): Observable<Role> {
        return this.api.get<Role>(`roles/${id}`, this.baseUrl);
    }

    createRole(roleName: string, companyId?: string | null, branchId?: string | null): Observable<Role> {
        return this.api.post<Role>('roles', { roleName, companyId, branchId }, this.baseUrl);
    }

    updateRole(id: string, roleName: string, branchId: string | null = null): Observable<Role> {
        return this.api.put<Role>(`roles/${id}`, { roleName, branchId }, this.baseUrl);
    }

    deleteRole(id: string): Observable<void> {
        return this.api.delete<void>(`roles/${id}`, this.baseUrl);
    }

    // Permissions
    getRolePermissions(roleId: string | number): Observable<RolePermission[]> {
        return this.api.get<RolePermission[]>(`roles/${roleId}/permissions`, this.baseUrl);
    }

    updateRolePermissions(roleId: string | number, permissions: RolePermission[]): Observable<void> {
        return this.api.put<void>(`roles/${roleId}/permissions`, permissions, this.baseUrl);
    }

    // Print Settings
    getRolePrintSettings(roleId: string | number, companyId?: string | null, branchId?: string | null): Observable<any[]> {
        let query = companyId ? `?companyId=${companyId}` : '?';
        if (branchId) query += (query === '?' ? '' : '&') + `branchId=${branchId}`;
        return this.api.get<any[]>(`roles/${roleId}/print-settings${query}`, this.baseUrl);
    }

    updateRolePrintSettings(roleId: string | number, settings: any[], companyId?: string | null, branchId?: string | null): Observable<void> {
        let query = companyId ? `?companyId=${companyId}` : '?';
        if (branchId) query += (query === '?' ? '' : '&') + `branchId=${branchId}`;
        return this.api.put<void>(`roles/${roleId}/print-settings${query}`, settings, this.baseUrl);
    }
}

