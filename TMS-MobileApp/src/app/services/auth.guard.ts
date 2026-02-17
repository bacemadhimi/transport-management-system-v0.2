import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = authService.isLoggedIn();
  console.log('Auth Guard - isLoggedIn:', isLoggedIn);
  if (isLoggedIn) {
    return true;
  } else {
    console.log('Auth Guard - redirecting to login');
    router.navigate(['/login']);
    return false;
  }
};