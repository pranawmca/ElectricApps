import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, catchError, tap, filter, take, switchMap } from 'rxjs';
import { environment } from '../../enviornments/environment';
import { LoginDto } from '../models/user.model';
import { Router } from '@angular/router';
import { ApiService } from '../../shared/api.service';
import { MatDialog } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  private readonly baseUrl = environment.api.auth;

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private branchIdSubject = new BehaviorSubject<string | null>(localStorage.getItem('branchId'));
  branchId$ = this.branchIdSubject.asObservable();

  // 🔐 LOGIN
  login(data: LoginDto): Observable<any> {
    const payload = {
      Dto: data
    };
    const url = `${this.baseUrl}/login`;
    console.log('[AuthService] Login attempt to:', url);
    return this.http.post<any>(url, payload).pipe(
      tap(res => this.storeTokens(res))
    );
  }

  // 🔄 REFRESH TOKENS (Shared with Interceptor and IdleService)
  refreshTokens(): Observable<any> {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => new Observable(obs => obs.next({ accessToken: this.getAccessToken() })))
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) {
      this.isRefreshing = false;
      this.logout();
      return throwError(() => new Error('No tokens available'));
    }

    const payload = { accessToken, refreshToken };
    return this.api.post<any>('refresh', payload, this.baseUrl).pipe(
      tap(res => {
        this.storeTokens(res);
        this.isRefreshing = false;
        this.refreshTokenSubject.next(res.accessToken || res.AccessToken);
      }),
      catchError(err => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(null);
        return throwError(() => err);
      })
    );
  }

  // 🕒 CHECK IF TOKEN IS EXPIRED SOON
  isTokenExpiredSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      // Check if it expires in the next 5 minutes
      return (exp - currentTime) < 300; 
    } catch (e) {
      return true;
    }
  }

  changePassword(data: any): Observable<any> {
    return this.api.post<any>('change-password', data, this.baseUrl);
  }

  forgotPassword(email: string): Observable<any> {
    return this.api.post<any>('forgot-password', { email }, this.baseUrl);
  }

  resetPassword(data: any): Observable<any> {
    return this.api.post<any>('reset-password', data, this.baseUrl);
  }

  // 💾 STORE TOKENS
  storeTokens(res: any): void {
    if (!res) return;

    // Support both camelCase and PascalCase from backend
    const token = res.accessToken || res.AccessToken;
    const refresh = res.refreshToken || res.RefreshToken;
    const email = res.email || res.Email;
    const userId = res.userId || res.UserId;
    const userName = res.userName || res.UserName;
    let roles = res.roles || res.Roles;

    console.log('[AuthService] Processing tokens. roles found in res:', !!roles);

    localStorage.setItem('accessToken', token || '');
    localStorage.setItem('refreshToken', refresh || '');

    // 🕵️ If roles are missing in response, try to decode from JWT
    if (!roles && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roleClaim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload['role'];
        if (roleClaim) {
          roles = Array.isArray(roleClaim) ? roleClaim : [roleClaim];
          console.log('[AuthService] Extracted roles from JWT:', roles);
        }
      } catch (e) {
        console.error('[AuthService] Failed to decode JWT for roles', e);
      }
    }

    if (roles) {
      localStorage.setItem('roles', JSON.stringify(roles));
    } else {
      localStorage.setItem('roles', JSON.stringify(['User'])); // Default fallback
    }

    if (email) localStorage.setItem('email', email);
    if (userId) localStorage.setItem('userId', userId);
    if (userName) localStorage.setItem('userName', userName);

    // Store Subscription Status
    const isExpired = res.isSubscriptionExpired || res.IsSubscriptionExpired;
    const subStatus = res.subscriptionStatus || res.SubscriptionStatus;
    localStorage.setItem('isSubscriptionExpired', isExpired ? 'true' : 'false');
    localStorage.setItem('subscriptionStatus', subStatus || 'Active');

    // Store Company Metadata
    const companyId = res.companyId || res.CompanyId;
    const branchId = res.branchId || res.BranchId;
    const branchName = res.branchName || res.BranchName;
    const companyName = res.companyName || res.CompanyName;
    const companyTagline = res.companyTagline || res.CompanyTagline;
    
    if (companyId) {
      localStorage.setItem('companyId', companyId);
      // 🛡️ Save original system context for Super Admin switching
      if (this.isSuperAdmin() && !localStorage.getItem('systemCompanyId')) {
        localStorage.setItem('systemCompanyId', companyId);
        if (companyName) localStorage.setItem('systemCompanyName', companyName);
      }
    } else {
      localStorage.removeItem('companyId');
    }

    if (branchId) {
      localStorage.setItem('branchId', branchId);
      this.branchIdSubject.next(branchId);
      localStorage.setItem('assignedBranches', branchId); // 🛡️ Keep original list for switching
      if (branchName) {
        localStorage.setItem('branchName', branchName);
      }
    } else {
      localStorage.removeItem('branchId');
      this.branchIdSubject.next(null);
      localStorage.removeItem('assignedBranches');
      localStorage.removeItem('branchName');
    }

    if (companyName) {
      localStorage.setItem('companyName', companyName);
    } else {
      localStorage.removeItem('companyName');
    }

    if (companyTagline) {
      localStorage.setItem('companyTagline', companyTagline);
    } else {
      localStorage.removeItem('companyTagline');
    }

    // Store Permissions
    const permissions = res.permissions || res.Permissions;
    if (permissions) {
      localStorage.setItem('permissions', JSON.stringify(permissions));
    }
  }

  getBranchId(): string | null {
    const bid = localStorage.getItem('branchId');
    if (!bid || bid === 'null' || bid === 'undefined') return null;
    return bid;
  }

  getWorkingBranchId(): string | null {
    return this.getBranchId();
  }

  getAssignedBranches(): string | null {
    return localStorage.getItem('assignedBranches');
  }

  getBranchName(): string | null {
    return localStorage.getItem('branchName');
  }

  setWorkingBranch(branchId: string | null, branchName: string | null = null): void {
    if (branchId) {
      localStorage.setItem('branchId', branchId);
      this.branchIdSubject.next(branchId);
      if (branchName) {
        localStorage.setItem('branchName', branchName);
      }
    } else {
      localStorage.removeItem('branchId');
      this.branchIdSubject.next(null);
      localStorage.removeItem('branchName');
      
      // 🚀 If Super Admin is switching back to Global View, restore System Company context
      if (this.isSuperAdmin()) {
        const sysId = localStorage.getItem('systemCompanyId');
        const sysName = localStorage.getItem('systemCompanyName');
        if (sysId) localStorage.setItem('companyId', sysId);
        if (sysName) localStorage.setItem('companyName', sysName);
      }
    }
  }

  isSubscriptionExpired(): boolean {
    return localStorage.getItem('isSubscriptionExpired') === 'true';
  }

  getSubscriptionStatus(): string {
    return localStorage.getItem('subscriptionStatus') || 'Active';
  }

  // 🔍 CHECK LOGIN STATUS
  isLoggedIn(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token && token !== '' && token !== 'undefined';
  }

  // 🚪 LOGOUT
  logout(): void {
    console.warn('[AuthService] Logout triggered');
    
    // 🚪 Close all open dialogs/popups
    this.dialog.closeAll();
    
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // 🔑 GET TOKEN
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  getUserRole(): string {
    const roles = localStorage.getItem('roles');
    if (!roles || roles === 'undefined' || roles === 'null') {
      return 'User';
    }

    try {
      const parsedRoles = JSON.parse(roles);
      if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
        // --- 🚀 FIX: Prioritize the most powerful role ---
        const priorityOrder = ['Default Admin', 'Super Admin', 'Admin', 'Manager', 'Warehouse', 'User'];
        for (const role of priorityOrder) {
          if (parsedRoles.includes(role)) return role;
        }
        return parsedRoles[0]; // Fallback to first if not in list
      }
      return parsedRoles || 'User';
    } catch (e) {
      console.error('[AuthService] Error parsing roles', e);
      return 'User';
    }
  }

  getUserName(): string {
    return localStorage.getItem('userName') || localStorage.getItem('email') || 'Unknown';
  }

  getUserEmail(): string {
    return localStorage.getItem('email') || 'system@decode.com';
  }

  getCompanyId(): string | null {
    const cid = localStorage.getItem('companyId');
    if (!cid || cid === 'null' || cid === 'undefined') return null;
    return cid;
  }

  getCompanyName(): string | null {
    const name = localStorage.getItem('companyName');
    if (!name || name === 'null' || name === 'undefined') return null;
    return name;
  }

  getCompanyTagline(): string | null {
    const tagline = localStorage.getItem('companyTagline');
    if (!tagline || tagline === 'null' || tagline === 'undefined') return null;
    return tagline;
  }

  isSuperAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'Super Admin' || role === 'Default Admin';
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }
}

