import { Room } from './room.model';
import { User } from './user.model';
import { Location } from './location.model';

export interface Booking {
  id: string;
  room_id: string;
  user_id: string;
  location_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  status: 'CONFIRMED' | 'CANCELLED';
  recurrence?: string;
  recurrence_group_id?: string;
  participants?: string[];
  created_at: string;
  room?: Room;
  user?: User;
  location?: Location;
}
