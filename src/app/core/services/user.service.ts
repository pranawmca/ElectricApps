import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviornments/environment';
import { User, RegisterUserDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {

    // Assuming UsersController is at /api/users
    private readonly baseUrl = environment.LoginApiBaseUrl.replace('/auth', '/users');
    private readonly authUrl = environment.LoginApiBaseUrl;

    constructor(private http: HttpClient) { }

    getAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(this.baseUrl);
    }

    // Create User uses Auth Register endpoint
    createUser(dto: RegisterUserDto): Observable<any> {
        return this.http.post(`${this.authUrl}/register`, dto);
    }

    updateStatus(id: string, isActive: boolean): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}/${id}/status`, isActive);
    }

    updateUser(id: string, dto: any): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/${id}`, dto);
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    checkDuplicate(userName: string, email: string, companyId?: string | null): Observable<{ exists: boolean, message: string }> {
        let url = `${this.baseUrl}/check-duplicate?userName=${userName}&email=${email}`;
        if (companyId) {
            url += `&companyId=${companyId}`;
        }
        return this.http.get<{ exists: boolean, message: string }>(url);
    }
}
