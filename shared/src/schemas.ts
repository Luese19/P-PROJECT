import { z } from 'zod';

// Coordinate schema
export const CoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Authentication schemas
export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  role: z.enum(['driver', 'commuter']),
  phone: z.string().optional(),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Route schemas
export const RouteCreateSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2),
  description: z.string().optional(),
  fare_base: z.number().positive().default(13),
  start_point: CoordinateSchema,
  end_point: CoordinateSchema,
  waypoints: z.array(CoordinateSchema).default([]),
});

// Location tracking schemas
export const DriverStartSharingSchema = z.object({
  driver_id: z.string().uuid(),
  route_id: z.string().uuid(),
  jeepney_id: z.string().uuid(),
});

export const LocationUpdateSchema = z.object({
  driver_id: z.string().uuid(),
  jeepney_id: z.string().uuid(),
  route_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().optional(),
  speed: z.number().optional(),
  accuracy: z.number().optional(),
  timestamp: z.string().datetime(),
});

export const CommuterSubscribeSchema = z.object({
  route_id: z.string().uuid(),
});

// Types inferred from schemas
export type SignUpData = z.infer<typeof SignUpSchema>;
export type SignInData = z.infer<typeof SignInSchema>;
export type RouteCreateData = z.infer<typeof RouteCreateSchema>;
export type DriverStartSharingData = z.infer<typeof DriverStartSharingSchema>;
export type LocationUpdateData = z.infer<typeof LocationUpdateSchema>;
export type CommuterSubscribeData = z.infer<typeof CommuterSubscribeSchema>;
