import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const token = localStorage.getItem('accessToken');

  console.log('[AuthGuard] token:', token);

  if (token) {
    if (auth.isSubscriptionExpired()) {
      return router.createUrlTree(['/subscribe']);
    }
    return true;
  }

  return router.createUrlTree(['/login']);
};
