// User types
export type UserRole = 'driver' | 'commuter';

export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile extends User {
  role: 'driver';
  license_number?: string;
  is_active: boolean;
  current_route_id?: string;
  current_jeepney_id?: string;
}

export interface CommuterProfile extends User {
  role: 'commuter';
  favorite_routes?: string[];
}

// Jeepney types
export interface Jeepney {
  id: string;
  plate_number: string;
  route_id: string;
  capacity: number;
  driver_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Route types
export interface Route {
  id: string;
  name: string;
  code: string;
  description?: string;
  fare_base: number;
  fare_student?: number;
  fare_senior?: number;
  fare_pwd?: number;
  fare_per_km?: number;
  waypoints: Coordinate[];
  start_point: Coordinate;
  end_point: Coordinate;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Location types
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinate {
  id: string;
  jeepney_id: string;
  driver_id: string;
  route_id: string;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

export interface LiveLocation extends Coordinate {
  jeepney_id: string;
  driver_id: string;
  route_id: string;
  heading?: number;
  speed?: number;
  timestamp: string;
  jeepney?: Jeepney;
  route?: Route;
}

// ETA types
export interface ETARequest {
  origin: Coordinate;
  destination: Coordinate;
  route_id?: string;
}

export interface ETAResponse {
  eta_minutes: number;
  distance_km: number;
  nearest_jeepneys: NearestJeepney[];
}

export interface NearestJeepney {
  jeepney_id: string;
  plate_number: string;
  route_name: string;
  distance_km: number;
  eta_minutes: number;
  location: Coordinate;
}

// Socket event types
export interface SocketEvents {
  // Driver events
  'driver:location-update': (location: Omit<Location, 'id' | 'timestamp'>) => void;
  'driver:start-sharing': (data: { route_id: string; jeepney_id: string }) => void;
  'driver:stop-sharing': () => void;

  // Commuter events
  'commuter:subscribe-route': (route_id: string) => void;
  'commuter:unsubscribe-route': (route_id: string) => void;
  'commuter:subscribe-area': (bounds: AreaBounds) => void;

  // Server broadcasts
  'jeepney:location-updated': (location: LiveLocation) => void;
  'jeepney:went-offline': (jeepney_id: string) => void;
  'route:jeepneys-update': (data: { route_id: string; jeepneys: LiveLocation[] }) => void;
}

export interface AreaBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
