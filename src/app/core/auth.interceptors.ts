import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError, Observable } from 'rxjs';
import { AuthService } from './services/auth.service';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // 🔐 Attach token, companyId and branchId (except login and refresh endpoints)
  if (token && !req.url.includes('/login') && !req.url.includes('/refresh')) {
    const companyId = authService.getCompanyId();
    const branchId = authService.getBranchId();
    req = addHeaders(req, token, companyId, branchId);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ⚠️ If 401 and not on login page, attempt refresh
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/login')) {
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

// 🛠️ Helper to add Authorization and Tenant headers
const addHeaders = (req: HttpRequest<any>, token: string, companyId: string | null, branchId: string | null) => {
  const headers: any = {
    Authorization: `Bearer ${token}`
  };
  
  if (companyId) {
    headers['X-Company-Id'] = companyId;
  }

  if (branchId) {
    headers['X-Branch-Id'] = branchId;
  }
  
  return req.clone({
    setHeaders: headers
  });
};

// 🔄 Handle 401 Error with Token Refresh
const handle401Error = (
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<any>> => {
  // 🕒 SECURITY CHECK: If user has been idle for too long, don't refresh, just logout
  const lastActivity = localStorage.getItem('lastActivity');
  const IDLE_TIME = 15 * 60 * 1000; // Match with IdleService
  
  if (lastActivity) {
    const diff = Date.now() - parseInt(lastActivity);
    if (diff >= IDLE_TIME) {
      console.warn('[AuthInterceptor] User idle for too long → skipping refresh → logout');
      authService.logout();
      return throwError(() => new Error('Session expired due to inactivity'));
    }
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshTokens().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(res.accessToken);

        console.log('[AuthInterceptor] Token refreshed successfully');
        return next(addHeaders(req, res.accessToken, authService.getCompanyId(), authService.getBranchId()));
      }),
      catchError((err) => {
        isRefreshing = false;
        console.error('[AuthInterceptor] Token refresh failed → logout');
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    // 🧱 Wait for the current refresh operation to finish
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next(addHeaders(req, token, authService.getCompanyId(), authService.getBranchId())))
    );
  }
};
