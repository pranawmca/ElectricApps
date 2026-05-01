import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, Observable } from 'rxjs';
import { AuthService } from './services/auth.service';

// 🛠️ Helper to add Authorization and Tenant headers
const addHeaders = (req: HttpRequest<any>, token: string | null, companyId: string | null, branchId: string | null) => {
  const headers: any = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (companyId) {
    headers['X-Company-Id'] = companyId;
  }

  // 🕵️ SMART BRANCH DETECTION:
  // If no branch in session, try to extract it from the request body (payload)
  let effectiveBranchId = branchId;
  if (!effectiveBranchId && req.body && typeof req.body === 'object') {
    effectiveBranchId = req.body.branchId || req.body.BranchId;
  }

  if (effectiveBranchId) {
    headers['X-Branch-Id'] = effectiveBranchId;
  }

  return req.clone({
    setHeaders: headers
  });
};

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // 🔐 Attach companyId and branchId (except login)
  // 🎟️ Attach Authorization token (except login and refresh)
  if (!req.url.includes('/login')) {
    const isRefreshReq = req.url.includes('/refresh');
    const companyId = authService.getCompanyId();
    const branchId = authService.getBranchId();

    // Pass null as token if it's a refresh request to avoid sending expired token in Authorization header
    const effectiveToken = isRefreshReq ? null : token;
    req = addHeaders(req, effectiveToken, companyId, branchId);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ⚠️ If 401 and not on login page, attempt refresh
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/login')) {
        console.warn('[AuthInterceptor] 401 detected. Attempting refresh via AuthService...');
        return authService.refreshTokens().pipe(
          switchMap((res: any) => {
            console.log('[AuthInterceptor] Retry original request with new token');
            const newToken = res.accessToken || res.AccessToken;
            return next(addHeaders(req, newToken, authService.getCompanyId(), authService.getBranchId()));
          }),
          catchError((err) => {
            console.error('[AuthInterceptor] 401 retry failed → logout');
            authService.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
