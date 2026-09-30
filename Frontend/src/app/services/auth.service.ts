import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/auth`;

  // Reactive state management for currently logged-in user
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {}

  /** Retrieve cached user metadata from localStorage */
  private getStoredUser(): User | null {
    const userJson = localStorage.getItem('meeting_system_user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  /** Synchronous getter for current user object */
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /** Send user registration payload to API */
  register(userData: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, userData);
  }

  /** Authenticate credentials, store JWT tokens in localStorage, and update reactive state */
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.access_token) {
          localStorage.setItem('meeting_system_access_token', response.access_token);
          localStorage.setItem('meeting_system_refresh_token', response.refresh_token);
          localStorage.setItem('meeting_system_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  /** Exchange long-lived refresh token for a fresh access token pair */
  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post<any>(`${this.apiUrl}/refresh`, { refresh_token: refreshToken }).pipe(
      tap(response => {
        if (response && response.access_token) {
          localStorage.setItem('meeting_system_access_token', response.access_token);
          localStorage.setItem('meeting_system_refresh_token', response.refresh_token);
          localStorage.setItem('meeting_system_user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  /** Clear local storage tokens and notify backend logout endpoint */
  logout(): void {
    const token = this.getAccessToken();
    this.clearStorage();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({ next: () => {}, error: () => {} });
    }
  }

  /** Clear authentication keys from localStorage */
  private clearStorage(): void {
    localStorage.removeItem('meeting_system_access_token');
    localStorage.removeItem('meeting_system_refresh_token');
    localStorage.removeItem('meeting_system_user');
    this.currentUserSubject.next(null);
  }

  /** Helper getter for Access Token */
  getAccessToken(): string | null {
    return localStorage.getItem('meeting_system_access_token');
  }

  /** Helper getter for Refresh Token */
  getRefreshToken(): string | null {
    return localStorage.getItem('meeting_system_refresh_token');
  }

  /** Check if user is currently logged in */
  isLoggedIn(): boolean {
    return !!this.getAccessToken() && this.currentUserValue !== null;
  }

  /** Fetch list of organization users for participant selection */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }
}


