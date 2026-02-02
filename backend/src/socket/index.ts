import { Server, Socket } from 'socket.io';
import { supabaseAdmin } from '../config/supabase';
import { SOCKET_EVENTS, LOCATION_STALE_THRESHOLD, DriverStartSharingSchema, LocationUpdateSchema } from 'shared';

// Types
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LiveLocation extends Coordinate {
  jeepney_id: string;
  driver_id: string;
  route_id: string;
  heading?: number;
  speed?: number;
  timestamp: string;
}

interface DriverState {
  socket_id: string;
  driver_id: string;
  jeepney_id: string;
  route_id: string;
  location?: LiveLocation;
  last_update: number;
}

// In-memory store for active drivers
const activeDrivers = new Map<string, DriverState>();

// In-memory store for live locations by route
const locationsByRoute = new Map<string, Map<string, LiveLocation>>();

export function setupSocketHandlers(io: Server) {
  // Cleanup stale drivers periodically
  setInterval(() => {
    const now = Date.now();
    activeDrivers.forEach((driver, driverId) => {
      if (now - driver.last_update > LOCATION_STALE_THRESHOLD) {
        console.log(`🚫 Driver ${driverId} went stale, removing`);
        handleDriverOffline(io, driver);
        activeDrivers.delete(driverId);
      }
    });
  }, 10000);

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Driver: Start sharing location
    socket.on(SOCKET_EVENTS.DRIVER_START_SHARING, async (rawData: any) => {
      const result = DriverStartSharingSchema.safeParse(rawData);
      if (!result.success) {
        console.error('Invalid driver:start-sharing data:', result.error);
        return;
      }
      const data = result.data;
      
      console.log(`🚌 Driver ${data.driver_id} started sharing on route ${data.route_id}`);
      
      activeDrivers.set(data.driver_id, {
        socket_id: socket.id,
        driver_id: data.driver_id,
        jeepney_id: data.jeepney_id,
        route_id: data.route_id,
        last_update: Date.now(),
      });

      // Join route room
      socket.join(`route:${data.route_id}`);

      // Update driver status in database
      try {
        await supabaseAdmin
          .from('users')
          .update({ 
            is_active: true, 
            current_route_id: data.route_id,
            current_jeepney_id: data.jeepney_id,
          })
          .eq('id', data.driver_id);
      } catch (error) {
        console.error('Error updating driver status:', error);
      }
    });

    // Driver: Update location
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (rawLocation: any) => {
      const result = LocationUpdateSchema.safeParse(rawLocation);
      if (!result.success) {
        console.error('Invalid location update:', result.error.issues[0].message);
        return;
      }
      const location = result.data;

      const driver = activeDrivers.get(location.driver_id);
      if (!driver) {
        console.warn(`⚠️ Location update from unknown driver: ${location.driver_id}`);
        return;
      }

      const liveLocation: LiveLocation = {
        jeepney_id: location.jeepney_id,
        driver_id: location.driver_id,
        route_id: location.route_id,
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        timestamp: new Date().toISOString(),
      };

      // Update in-memory state
      driver.location = liveLocation;
      driver.last_update = Date.now();

      // Update route locations map
      if (!locationsByRoute.has(location.route_id)) {
        locationsByRoute.set(location.route_id, new Map());
      }
      locationsByRoute.get(location.route_id)!.set(location.jeepney_id, liveLocation);

      // Broadcast to route subscribers
      io.to(`route:${location.route_id}`).emit(
        SOCKET_EVENTS.JEEPNEY_LOCATION_UPDATED,
        liveLocation
      );

      // Store in database (fire and forget for performance)
      supabaseAdmin
        .from('locations')
        .insert({
          jeepney_id: location.jeepney_id,
          driver_id: location.driver_id,
          route_id: location.route_id,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
        })
        .then(() => {}, (err) => console.error('Error storing location:', err));
    });

    // Driver: Stop sharing
    socket.on(SOCKET_EVENTS.DRIVER_STOP_SHARING, async (data: { driver_id: string }) => {
      const driver = activeDrivers.get(data.driver_id);
      if (driver) {
        handleDriverOffline(io, driver);
        activeDrivers.delete(data.driver_id);
      }
    });

    // Commuter: Subscribe to route
    socket.on(SOCKET_EVENTS.COMMUTER_SUBSCRIBE_ROUTE, (route_id: string) => {
      console.log(`👤 Commuter subscribed to route: ${route_id}`);
      socket.join(`route:${route_id}`);

      // Send current jeepneys on this route
      const routeLocations = locationsByRoute.get(route_id);
      if (routeLocations) {
        const jeepneys = Array.from(routeLocations.values());
        socket.emit(SOCKET_EVENTS.ROUTE_JEEPNEYS_UPDATE, {
          route_id,
          jeepneys,
        });
      }
    });

    // Commuter: Unsubscribe from route
    socket.on(SOCKET_EVENTS.COMMUTER_UNSUBSCRIBE_ROUTE, (route_id: string) => {
      socket.leave(`route:${route_id}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      // Find and remove driver if this was a driver socket
      activeDrivers.forEach((driver, driverId) => {
        if (driver.socket_id === socket.id) {
          handleDriverOffline(io, driver);
          activeDrivers.delete(driverId);
        }
      });
    });
  });
}

async function handleDriverOffline(io: Server, driver: DriverState) {
  console.log(`🚫 Driver ${driver.driver_id} went offline`);

  // Remove from route locations
  const routeLocations = locationsByRoute.get(driver.route_id);
  if (routeLocations) {
    routeLocations.delete(driver.jeepney_id);
  }

  // Notify subscribers
  io.to(`route:${driver.route_id}`).emit(
    SOCKET_EVENTS.JEEPNEY_WENT_OFFLINE,
    driver.jeepney_id
  );

  // Update database
  try {
    await supabaseAdmin
      .from('users')
      .update({ 
        is_active: false, 
        current_route_id: null,
        current_jeepney_id: null,
      })
      .eq('id', driver.driver_id);
  } catch (error) {
    console.error('Error updating driver offline status:', error);
  }
}

// Export for API routes to access
export function getActiveJeepneysByRoute(routeId: string): LiveLocation[] {
  const routeLocations = locationsByRoute.get(routeId);
  return routeLocations ? Array.from(routeLocations.values()) : [];
}

export function getAllActiveJeepneys(): LiveLocation[] {
  const all: LiveLocation[] = [];
  locationsByRoute.forEach((locations) => {
    all.push(...Array.from(locations.values()));
  });
  return all;
}
