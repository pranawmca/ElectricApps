import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CompanyProfileDto, UpsertCompanyRequest } from '../model/company.model';
import { ApiService } from '../../../shared/api.service';
import { environment } from '../../../enviornments/environment';


@Injectable({
    providedIn: 'root'
})
export class CompanyService {
    private readonly api = inject(ApiService);
    private readonly baseUrl = environment.CompanyApiBaseUrl;
    private readonly identityUrl = environment.api.identity;
    
    /**
     * Fetch all companies for selection (Super Admin only)
     */
    getAllCompanies(): Observable<any[]> {
        return this.getPaged({ pageNumber: 1, pageSize: 1000 }).pipe(
            map(res => {
                if (!res) return [];
                const items = res.items || res.Items || res.data || res.Data;
                if (Array.isArray(items)) return items;
                if (Array.isArray(res)) return res;
                return [];
            })
        );
    }

    /**
     * Naya Tenant (Company) initialize karne ke liye Identity microservice me
     */
    setupTenant(companyName: string): Observable<any> {
        return this.api.post<any>('customer/portal/setup-company', { companyName }, this.identityUrl);
    }

    /**
     * Master Company Profile fetch karne ke liye (Report Headers ke liye best)
     */
    getCompanyProfile(): Observable<CompanyProfileDto> {
        return this.api.get<CompanyProfileDto>('company/profile', this.baseUrl);
    }

    /**
     * Fetch branches (addresses) for a specific company
     */
    getBranchesByCompany(companyId: string): Observable<any[]> {
        return this.getById(companyId).pipe(
            map(profile => {
                const addresses = profile.addresses || (profile as any).Addresses || [];
                return addresses.map((addr: any) => ({
                    ...addr,
                    companyName: profile.name || (profile as any).Name,
                    companyProfileId: profile.id || (profile as any).Id,
                    name: addr.branchName || addr.name || addr.city || 'Unnamed Branch'
                }));
            })
        );
    }

    /**
     * Helper to get branches for the currently logged-in company
     */
    getBranches(): Observable<any[]> {
        return this.getCompanyProfile().pipe(
            map(profile => {
                const addresses = profile.addresses || (profile as any).Addresses || [];
                return addresses.map((addr: any) => ({
                    ...addr,
                    name: addr.branchName || addr.name || addr.city || 'Unnamed Branch'
                }));
            })
        );
    }

    /**
     * Paged list fetch karne ke liye
     */
    getPaged(request: any): Observable<any> {
        return this.api.post<any>('company/paged', request, this.baseUrl);
    }

    /**
     * ID ke base par specific company data lane ke liye
     */
    getById(id: string): Observable<CompanyProfileDto> {
        return this.api.get<CompanyProfileDto>(`company/${id}`, this.baseUrl);
    }

    /**
     * Nayi company profile create karne ke liye
     */
    insertCompany(company: UpsertCompanyRequest): Observable<string> {
        return this.api.post<string>('company/create', company, this.baseUrl);
    }

    /**
     * Existing profile ko update karne ke liye
     */
    updateCompany(id: string, profile: UpsertCompanyRequest): Observable<string> {
        return this.api.put<string>(`company/update/${id}`, profile, this.baseUrl);
    }

    /**
     * Profile delete karne ke liye
     */
    deleteCompany(id: string): Observable<boolean> {
        return this.api.delete<boolean>(`company/${id}`, this.baseUrl);
    }

    /**
     * Bulk delete profiles
     */
    deleteMany(ids: number[]): Observable<any> {
        return this.api.post<any>('company/bulk-delete', ids, this.baseUrl);
    }

    /**
     * Company Logo upload karne ke liye
     */
    uploadLogo(id: string, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.api.post<any>(`company/upload-logo/${id}`, formData, this.baseUrl);
    }
}
