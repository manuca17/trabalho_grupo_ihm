import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  return authService.isAuthenticated ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  return authService.isAuthenticated
    ? router.createUrlTree(['/tabs/tab5'], { queryParams: { nav: 'home' } })
    : true;
};
