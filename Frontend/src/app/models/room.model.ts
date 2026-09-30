import { Location } from './location.model';

export interface Room {
  id: string;
  name: string;
  capacity: number;
  location_id?: string;
  location?: Location;
  status: 'AVAILABLE' | 'UNDER_MAINTENANCE' | 'CURRENTLY_UNAVAILABLE';
  features: string[];
  is_active: boolean;
  description?: string;
  image_url?: string;
}
