import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/booking.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/bookings`;

  getBookings(filters?: { upcoming_only?: boolean; past_only?: boolean }): Observable<Booking[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.upcoming_only !== undefined) {
        params = params.set('upcoming_only', filters.upcoming_only.toString());
      }
      if (filters.past_only !== undefined) {
        params = params.set('past_only', filters.past_only.toString());
      }
    }
    return this.http.get<Booking[]>(this.apiUrl, { params });
  }

  createBooking(bookingData: {
    room_id: string;
    title: string;
    start_time: string;
    end_time: string;
  }): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, bookingData);
  }

  updateBooking(id: string, bookingData: {
    title?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
  }): Observable<Booking> {
    return this.http.put<Booking>(`${this.apiUrl}/${id}`, bookingData);
  }

  cancelBooking(id: string): Observable<Booking> {
    return this.http.delete<Booking>(`${this.apiUrl}/${id}`);
  }
}
