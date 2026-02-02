import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getActiveJeepneysByRoute, getAllActiveJeepneys } from '../socket';

const AVERAGE_JEEPNEY_SPEED_KPH = 20; // Average speed in traffic

export const locationsRouter = Router();

// Get live jeepneys on a route (from in-memory store)
locationsRouter.get('/live/route/:routeId', asyncHandler(async (req, res) => {
  const { routeId } = req.params;
  
  const jeepneys = getActiveJeepneysByRoute(routeId);

  res.json({
    success: true,
    data: jeepneys,
    count: jeepneys.length,
  });
}));

// Get all live jeepneys
locationsRouter.get('/live', asyncHandler(async (req, res) => {
  const jeepneys = getAllActiveJeepneys();

  res.json({
    success: true,
    data: jeepneys,
    count: jeepneys.length,
  });
}));

// Get ETA for a destination
locationsRouter.post('/eta', asyncHandler(async (req, res) => {
  const { origin, destination, route_id } = req.body;

  if (!origin || !destination) {
    throw createError('Origin and destination coordinates are required', 400);
  }

  // Get active jeepneys
  const jeepneys = route_id 
    ? getActiveJeepneysByRoute(route_id)
    : getAllActiveJeepneys();

  if (jeepneys.length === 0) {
    return res.json({
      success: true,
      data: {
        eta_minutes: null,
        distance_km: null,
        nearest_jeepneys: [],
        message: 'No active jeepneys found',
      },
    });
  }

  // Calculate distances and ETAs for each jeepney
  const nearestJeepneys = jeepneys
    .map((jeepney) => {
      const distanceToUser = calculateDistance(
        origin.latitude,
        origin.longitude,
        jeepney.latitude,
        jeepney.longitude
      );

      // Simple ETA based on average speed
      const eta_minutes = Math.round((distanceToUser / AVERAGE_JEEPNEY_SPEED_KPH) * 60);

      return {
        jeepney_id: jeepney.jeepney_id,
        route_id: jeepney.route_id,
        distance_km: Math.round(distanceToUser * 100) / 100,
        eta_minutes,
        location: {
          latitude: jeepney.latitude,
          longitude: jeepney.longitude,
        },
      };
    })
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, 5); // Return top 5 nearest

  // Calculate total distance from origin to destination
  const totalDistance = calculateDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  res.json({
    success: true,
    data: {
      eta_minutes: nearestJeepneys[0]?.eta_minutes || null,
      distance_km: Math.round(totalDistance * 100) / 100,
      nearest_jeepneys: nearestJeepneys,
    },
  });
}));

// Get location history for a jeepney (for analytics)
locationsRouter.get('/history/:jeepneyId', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { jeepneyId } = req.params;
  const { from, to, limit = 100 } = req.query;

  let query = supabaseAdmin
    .from('locations')
    .select('*')
    .eq('jeepney_id', jeepneyId)
    .order('timestamp', { ascending: false })
    .limit(Number(limit));

  if (from) {
    query = query.gte('timestamp', from);
  }

  if (to) {
    query = query.lte('timestamp', to);
  }

  const { data: locations, error } = await query;

  if (error) {
    throw createError('Failed to fetch location history', 500);
  }

  res.json({
    success: true,
    data: locations,
  });
}));

// Find nearest jeepneys to a point
locationsRouter.post('/nearest', asyncHandler(async (req, res) => {
  const { latitude, longitude, route_id, limit = 5 } = req.body;

  if (!latitude || !longitude) {
    throw createError('Latitude and longitude are required', 400);
  }

  const jeepneys = route_id 
    ? getActiveJeepneysByRoute(route_id)
    : getAllActiveJeepneys();

  const nearest = jeepneys
    .map((jeepney) => ({
      ...jeepney,
      distance_km: calculateDistance(
        latitude,
        longitude,
        jeepney.latitude,
        jeepney.longitude
      ),
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, Number(limit));

  res.json({
    success: true,
    data: nearest,
  });
}));

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
