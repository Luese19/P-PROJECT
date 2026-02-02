// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// MapTiler Configuration (alternative to Google Maps)
export const MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY || 'lNjLi9IJl653YF35vEcP';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase configuration is missing. Please check your .env file.');
}

// Google Maps API Key (for web)
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Map defaults (Metro Manila center)
export const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Location settings
export const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
export const LOCATION_DISTANCE_FILTER = 10; // meters
