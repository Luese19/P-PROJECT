import { create } from 'zustand';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getSocket, connectSocket } from '../lib/socket';
import { LOCATION_UPDATE_INTERVAL, LOCATION_DISTANCE_FILTER } from '../config';

const BACKGROUND_LOCATION_TASK = 'background-location-tracking';

// Register background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      const socket = getSocket();
      if (socket.connected) {
        // We need to get the state from the store since we're outside a component
        const state = useLocationStore.getState();
        if (state.isSharing && state.currentDriverId && state.currentRouteId && state.currentJeepneyId) {
          socket.emit('driver:location-update', {
            driver_id: state.currentDriverId,
            jeepney_id: state.currentJeepneyId,
            route_id: state.currentRouteId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: new Date(location.timestamp).toISOString(),
          });
        }
      }
    }
  }
});

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface LiveJeepney extends Coordinate {
  jeepney_id: string;
  driver_id: string;
  route_id: string;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface Route {
  id: string;
  name: string;
  code: string;
  description?: string;
  fare_base: number;
  fare_student?: number;
  fare_senior?: number;
  fare_pwd?: number;
  start_point: Coordinate;
  end_point: Coordinate;
  waypoints?: Coordinate[];
}

interface LocationState {
  // User location
  userLocation: Coordinate | null;
  locationPermission: boolean;
  isTrackingUser: boolean;

  // Jeepney locations (for commuters)
  jeepneys: Map<string, LiveJeepney>;
  subscribedRouteId: string | null;

  // Driver tracking state
  isSharing: boolean;
  currentDriverId: string | null;
  currentRouteId: string | null;
  currentJeepneyId: string | null;

  // Routes
  routes: Route[];

  // Actions
  setUserLocation: (location: Coordinate | null) => void;
  requestLocationPermission: () => Promise<boolean>;
  startUserTracking: () => Promise<void>;
  stopUserTracking: () => void;

  // Commuter actions
  subscribeToRoute: (routeId: string) => void;
  unsubscribeFromRoute: () => void;
  updateJeepneyLocation: (jeepney: LiveJeepney) => void;
  removeJeepney: (jeepneyId: string) => void;

  // Driver actions
  startSharing: (driverId: string, routeId: string, jeepneyId: string) => void;
  stopSharing: (driverId: string) => void;

  // Routes
  setRoutes: (routes: Route[]) => void;
}

let locationSubscription: Location.LocationSubscription | null = null;

export const useLocationStore = create<LocationState>((set, get) => ({
  userLocation: null,
  locationPermission: false,
  isTrackingUser: false,
  jeepneys: new Map(),
  subscribedRouteId: null,
  isSharing: false,
  currentDriverId: null,
  currentRouteId: null,
  currentJeepneyId: null,
  routes: [],

  setUserLocation: (location) => set({ userLocation: location }),

  requestLocationPermission: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      set({ locationPermission: granted });
      return granted;
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  },

  startUserTracking: async () => {
    const hasPermission = await get().requestLocationPermission();
    if (!hasPermission) return;

    // Get initial location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    set({
      userLocation: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      isTrackingUser: true,
    });

    // Start watching location
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: LOCATION_DISTANCE_FILTER,
      },
      (location) => {
        const { isSharing, currentDriverId, currentRouteId, currentJeepneyId } = get();
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        set({ userLocation: newLocation });

        // If driver is sharing, emit location update
        if (isSharing && currentDriverId && currentRouteId && currentJeepneyId) {
          const socket = getSocket();
          socket.emit('driver:location-update', {
            driver_id: currentDriverId,
            jeepney_id: currentJeepneyId,
            route_id: currentRouteId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: new Date(location.timestamp).toISOString(),
          });
        }
      }
    );
  },

  stopUserTracking: () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    set({ isTrackingUser: false });
  },

  subscribeToRoute: (routeId) => {
    connectSocket();
    const socket = getSocket();

    // Unsubscribe from previous route
    const { subscribedRouteId } = get();
    if (subscribedRouteId) {
      socket.emit('commuter:unsubscribe-route', subscribedRouteId);
    }

    // Subscribe to new route
    socket.emit('commuter:subscribe-route', routeId);
    set({ subscribedRouteId: routeId, jeepneys: new Map() });

    // Listen for jeepney updates
    socket.off('jeepney:location-updated');
    socket.on('jeepney:location-updated', (jeepney: LiveJeepney) => {
      get().updateJeepneyLocation(jeepney);
    });

    socket.off('jeepney:went-offline');
    socket.on('jeepney:went-offline', (jeepneyId: string) => {
      get().removeJeepney(jeepneyId);
    });

    socket.off('route:jeepneys-update');
    socket.on('route:jeepneys-update', (data: { route_id: string; jeepneys: LiveJeepney[] }) => {
      const newJeepneys = new Map<string, LiveJeepney>();
      data.jeepneys.forEach((j) => newJeepneys.set(j.jeepney_id, j));
      set({ jeepneys: newJeepneys });
    });
  },

  unsubscribeFromRoute: () => {
    const { subscribedRouteId } = get();
    if (subscribedRouteId) {
      const socket = getSocket();
      socket.emit('commuter:unsubscribe-route', subscribedRouteId);
      set({ subscribedRouteId: null, jeepneys: new Map() });
    }
  },

  updateJeepneyLocation: (jeepney) => {
    set((state) => {
      const newJeepneys = new Map(state.jeepneys);
      newJeepneys.set(jeepney.jeepney_id, jeepney);
      return { jeepneys: newJeepneys };
    });
  },

  removeJeepney: (jeepneyId) => {
    set((state) => {
      const newJeepneys = new Map(state.jeepneys);
      newJeepneys.delete(jeepneyId);
      return { jeepneys: newJeepneys };
    });
  },

  startSharing: async (driverId, routeId, jeepneyId) => {
    // Request background permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted');
    }

    connectSocket();
    const socket = getSocket();

    socket.emit('driver:start-sharing', {
      driver_id: driverId,
      route_id: routeId,
      jeepney_id: jeepneyId,
    });

    set({
      isSharing: true,
      currentDriverId: driverId,
      currentRouteId: routeId,
      currentJeepneyId: jeepneyId,
    });

    // Start background tracking
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_UPDATE_INTERVAL,
      distanceInterval: LOCATION_DISTANCE_FILTER,
      foregroundService: {
        notificationTitle: 'Jeep-Track is active',
        notificationBody: 'Sharing your location with commuters',
        notificationColor: '#1a73e8',
      },
      pausesUpdatesAutomatically: false,
    });
  },

  stopSharing: async (driverId) => {
    const socket = getSocket();
    socket.emit('driver:stop-sharing', { driver_id: driverId });

    set({
      isSharing: false,
      currentDriverId: null,
      currentRouteId: null,
      currentJeepneyId: null,
    });

    // Stop background tracking
    const isRegisterd = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegisterd) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  },

  setRoutes: (routes) => set({ routes }),
}));
