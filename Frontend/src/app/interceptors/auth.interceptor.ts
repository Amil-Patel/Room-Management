import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();
  let authReq = req;

  // Attach Authorization header if access token is available in localStorage
  if (token && !req.url.includes('/auth/refresh')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle API responses & intercept 401 Unauthorized errors
  return next(authReq).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/login')
      ) {
        // Handle Token Refresh flow
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((response) => {
              isRefreshing = false;
              refreshTokenSubject.next(response.access_token);
              
              // Retry the original failed request with the new access token
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${response.access_token}`
                  }
                })
              );
            }),
            catchError((refreshErr) => {
              // If refresh token also fails/expires, force logout and redirect to Login page
              isRefreshing = false;
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            })
          );
        } else {
          // If a refresh is already in progress, wait until new token is ready, then retry request
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((jwtToken) => {
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${jwtToken}`
                  }
                })
              );
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};

