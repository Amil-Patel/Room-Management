import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Room } from '../models/room.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/rooms`;

  getRooms(filters?: {
    min_capacity?: number;
    building_name?: string;
    floor?: string;
    features?: string[];
    start_time?: string;
    end_time?: string;
    search?: string;
  }): Observable<Room[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.min_capacity !== undefined && filters.min_capacity !== null && filters.min_capacity !== ('' as any)) {
        const capacity = Number(filters.min_capacity);
        if (!Number.isNaN(capacity) && capacity > 0) {
          params = params.set('min_capacity', capacity.toString());
        }
      }
      if (filters.building_name) {
        params = params.set('building_name', filters.building_name);
      }
      if (filters.floor) {
        params = params.set('floor', filters.floor);
      }
      if (filters.start_time) {
        params = params.set('start_time', filters.start_time);
      }
      if (filters.end_time) {
        params = params.set('end_time', filters.end_time);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.features && filters.features.length > 0) {
        filters.features.forEach(feature => {
          params = params.append('features', feature);
        });
      }
    }

    return this.http.get<Room[]>(this.apiUrl, { params });
  }

  getRoom(id: string): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/${id}`);
  }

  resolveImageUrl(url?: string | null): string {
    const fallback = 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${environment.uploadsBaseUrl}${url.startsWith('/') ? url : '/' + url}`;
  }
}
