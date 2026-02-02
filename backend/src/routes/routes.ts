import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';

export const routesRouter = Router();

// Get all routes
routesRouter.get('/', asyncHandler(async (req, res) => {
  const { data: routes, error } = await supabaseAdmin
    .from('routes')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw createError('Failed to fetch routes', 500);
  }

  res.json({
    success: true,
    data: routes,
  });
}));

// Get single route
routesRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: route, error } = await supabaseAdmin
    .from('routes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !route) {
    throw createError('Route not found', 404);
  }

  res.json({
    success: true,
    data: route,
  });
}));

// Get route by code
routesRouter.get('/code/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;

  const { data: route, error } = await supabaseAdmin
    .from('routes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !route) {
    throw createError('Route not found', 404);
  }

  res.json({
    success: true,
    data: route,
  });
}));

// Create route (admin only - for seeding)
routesRouter.post('/', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { name, code, description, fare_base, fare_student, fare_senior, fare_pwd, fare_per_km, waypoints, start_point, end_point } = req.body;

  if (!name || !code || !start_point || !end_point) {
    throw createError('Missing required fields', 400);
  }

  const { data: route, error } = await supabaseAdmin
    .from('routes')
    .insert({
      name,
      code: code.toUpperCase(),
      description,
      fare_base: fare_base || 13,
      fare_student: fare_student || 10,
      fare_senior: fare_senior || 10,
      fare_pwd: fare_pwd || 10,
      fare_per_km,
      waypoints: waypoints || [],
      start_point,
      end_point,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw createError('Failed to create route: ' + error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: route,
  });
}));

// Search routes by location
routesRouter.post('/search', asyncHandler(async (req, res) => {
  const { latitude, longitude, radius_km = 2 } = req.body;

  if (!latitude || !longitude) {
    throw createError('Latitude and longitude are required', 400);
  }

  // For now, return all active routes
  // TODO: Implement PostGIS spatial query for nearby routes
  const { data: routes, error } = await supabaseAdmin
    .from('routes')
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw createError('Failed to search routes', 500);
  }

  res.json({
    success: true,
    data: routes,
  });
}));

// Update route fares (drivers can update)
routesRouter.patch('/:id/fares', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { fare_base, fare_student, fare_senior, fare_pwd } = req.body;

  console.log('Updating fares for route:', id);
  console.log('Fare data:', { fare_base, fare_student, fare_senior, fare_pwd });

  const updateData: any = { updated_at: new Date().toISOString() };
  if (fare_base !== undefined) updateData.fare_base = fare_base;
  if (fare_student !== undefined) updateData.fare_student = fare_student;
  if (fare_senior !== undefined) updateData.fare_senior = fare_senior;
  if (fare_pwd !== undefined) updateData.fare_pwd = fare_pwd;

  console.log('Update data:', updateData);

  const { data: route, error } = await supabaseAdmin
    .from('routes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw createError('Failed to update route fares: ' + error.message, 500);
  }

  console.log('Updated route:', route);

  res.json({
    success: true,
    data: route,
  });
}));
// Update route waypoints (drivers can record route path)
routesRouter.patch('/:id/waypoints', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { waypoints, start_point, end_point } = req.body;

  if (!waypoints || !Array.isArray(waypoints)) {
    throw createError('Waypoints must be an array', 400);
  }

  const updateData: any = { 
    waypoints,
    updated_at: new Date().toISOString() 
  };
  
  // Optionally update start and end points based on recorded waypoints
  if (start_point) updateData.start_point = start_point;
  if (end_point) updateData.end_point = end_point;

  const { data: route, error } = await supabaseAdmin
    .from('routes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError('Failed to update route waypoints: ' + error.message, 500);
  }

  res.json({
    success: true,
    data: route,
    message: `Route path updated with ${waypoints.length} waypoints`,
  });
}));