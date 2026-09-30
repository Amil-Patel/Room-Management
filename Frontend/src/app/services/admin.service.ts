import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { Room } from '../models/room.model';
import { Booking } from '../models/booking.model';
import { Location } from '../models/location.model';
import { AuditLog } from '../models/audit-log.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/admin`;

  // Executive Analytics
  getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analytics`);
  }

  // Audit Logs
  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.apiUrl}/audit-logs`);
  }

  // Users Management
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  toggleUserStatus(userId: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/toggle-status`, {});
  }

  // Locations Management
  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.apiUrl}/locations`);
  }

  createLocation(locData: any): Observable<Location> {
    return this.http.post<Location>(`${this.apiUrl}/locations`, locData);
  }

  updateLocation(locId: string, locData: any): Observable<Location> {
    return this.http.put<Location>(`${this.apiUrl}/locations/${locId}`, locData);
  }

  // Rooms Management
  getRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/rooms`);
  }

  createRoom(roomData: any): Observable<Room> {
    return this.http.post<Room>(`${this.apiUrl}/rooms`, roomData);
  }

  updateRoom(roomId: string, roomData: any): Observable<Room> {
    return this.http.put<Room>(`${this.apiUrl}/rooms/${roomId}`, roomData);
  }

  // Bookings Management
  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/bookings`);
  }

  cancelBooking(bookingId: string): Observable<Booking> {
    return this.http.put<Booking>(`${this.apiUrl}/bookings/${bookingId}/cancel`, {});
  }
}
