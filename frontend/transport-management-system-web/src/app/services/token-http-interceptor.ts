import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { catchError, throwError } from 'rxjs';

export const tokenHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const jwtHelper = new JwtHelperService();
  const token = localStorage.getItem('token');


  if (token && jwtHelper.isTokenExpired(token)) {
    localStorage.removeItem('authLila');
    localStorage.removeItem('token');
    router.navigateByUrl('/login');
    return throwError(() => new Error('Token expired'));
  }


  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401) {
        localStorage.removeItem('authLila');
        localStorage.removeItem('token');
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};
