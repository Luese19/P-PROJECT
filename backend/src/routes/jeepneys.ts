import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';

export const jeepneysRouter = Router();

// Get all jeepneys
jeepneysRouter.get('/', asyncHandler(async (req, res) => {
  const { route_id, is_active } = req.query;

  let query = supabaseAdmin
    .from('jeepneys')
    .select(`
      *,
      route:routes(id, name, code),
      driver:users(id, full_name)
    `);

  if (route_id) {
    query = query.eq('route_id', route_id);
  }

  if (is_active !== undefined) {
    query = query.eq('is_active', is_active === 'true');
  }

  const { data: jeepneys, error } = await query;

  if (error) {
    throw createError('Failed to fetch jeepneys', 500);
  }

  res.json({
    success: true,
    data: jeepneys,
  });
}));

// Get single jeepney
jeepneysRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: jeepney, error } = await supabaseAdmin
    .from('jeepneys')
    .select(`
      *,
      route:routes(id, name, code),
      driver:users(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error || !jeepney) {
    throw createError('Jeepney not found', 404);
  }

  res.json({
    success: true,
    data: jeepney,
  });
}));

// Create jeepney (for seeding/admin)
jeepneysRouter.post('/', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { plate_number, route_id, capacity } = req.body;

  if (!plate_number || !route_id) {
    throw createError('Plate number and route_id are required', 400);
  }

  const { data: jeepney, error } = await supabaseAdmin
    .from('jeepneys')
    .insert({
      plate_number: plate_number.toUpperCase(),
      route_id,
      capacity: capacity || 20,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw createError('Failed to create jeepney: ' + error.message, 500);
  }

  res.status(201).json({
    success: true,
    data: jeepney,
  });
}));

// Assign driver to jeepney
jeepneysRouter.post('/:id/assign-driver', authMiddleware, requireRole('driver'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const driver_id = req.user!.id;

  // Check if driver is already assigned to another jeepney
  const { data: existingAssignment } = await supabaseAdmin
    .from('jeepneys')
    .select('id, plate_number')
    .eq('driver_id', driver_id)
    .single();

  if (existingAssignment) {
    throw createError(`Already assigned to jeepney ${existingAssignment.plate_number}`, 400);
  }

  const { data: jeepney, error } = await supabaseAdmin
    .from('jeepneys')
    .update({ driver_id })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError('Failed to assign driver', 500);
  }

  res.json({
    success: true,
    data: jeepney,
    message: 'Driver assigned successfully',
  });
}));

// Unassign driver from jeepney
jeepneysRouter.post('/:id/unassign-driver', authMiddleware, requireRole('driver'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data: jeepney, error } = await supabaseAdmin
    .from('jeepneys')
    .update({ driver_id: null })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw createError('Failed to unassign driver', 500);
  }

  res.json({
    success: true,
    data: jeepney,
    message: 'Driver unassigned successfully',
  });
}));

// Get jeepneys for a route
jeepneysRouter.get('/route/:routeId', asyncHandler(async (req, res) => {
  const { routeId } = req.params;

  const { data: jeepneys, error } = await supabaseAdmin
    .from('jeepneys')
    .select(`
      *,
      driver:users(id, full_name)
    `)
    .eq('route_id', routeId)
    .eq('is_active', true);

  if (error) {
    throw createError('Failed to fetch jeepneys', 500);
  }

  res.json({
    success: true,
    data: jeepneys,
  });
}));
