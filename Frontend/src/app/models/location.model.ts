export interface Location {
  id: string;
  building_name: string;
  floor: string;
  block?: string;
  city?: string;
  address?: string;
  is_active: boolean;
}
