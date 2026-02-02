// API Constants
export const API_VERSION = 'v1';

// Location update interval (ms)
export const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
export const LOCATION_STALE_THRESHOLD = 30000; // 30 seconds - consider jeepney offline

// Map defaults (Metro Manila center)
export const DEFAULT_MAP_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Philippines bounds
export const PH_BOUNDS = {
  north: 21.12,
  south: 4.58,
  east: 126.6,
  west: 116.95,
};

// Pasig-Cubao route bounds (for initial testing)
export const PASIG_CUBAO_BOUNDS = {
  north: 14.62,
  south: 14.55,
  east: 121.08,
  west: 121.03,
};

// ETA calculation constants
export const AVERAGE_JEEPNEY_SPEED_KPH = 20; // Average speed in traffic
export const WALKING_SPEED_KPH = 5;

// Distance thresholds
export const NEARBY_THRESHOLD_KM = 0.5; // 500 meters
export const APPROACHING_THRESHOLD_KM = 0.2; // 200 meters

// Socket events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Driver
  DRIVER_LOCATION_UPDATE: 'driver:location-update',
  DRIVER_START_SHARING: 'driver:start-sharing',
  DRIVER_STOP_SHARING: 'driver:stop-sharing',

  // Commuter
  COMMUTER_SUBSCRIBE_ROUTE: 'commuter:subscribe-route',
  COMMUTER_UNSUBSCRIBE_ROUTE: 'commuter:unsubscribe-route',
  COMMUTER_SUBSCRIBE_AREA: 'commuter:subscribe-area',

  // Server broadcasts
  JEEPNEY_LOCATION_UPDATED: 'jeepney:location-updated',
  JEEPNEY_WENT_OFFLINE: 'jeepney:went-offline',
  ROUTE_JEEPNEYS_UPDATE: 'route:jeepneys-update',
} as const;

// User roles
export const USER_ROLES = {
  DRIVER: 'driver',
  COMMUTER: 'commuter',
} as const;

// Sample routes for testing
export const SAMPLE_ROUTES = [
  {
    code: 'PASIG-CUBAO',
    name: 'Pasig - Cubao',
    description: 'Pasig Palengke to Cubao via C5',
  },
  {
    code: 'CUBAO-PASIG',
    name: 'Cubao - Pasig',
    description: 'Cubao to Pasig Palengke via C5',
  },
  {
    code: 'MAKATI-QUIAPO',
    name: 'Makati - Quiapo',
    description: 'Makati CBD to Quiapo via EDSA',
  },
] as const;
