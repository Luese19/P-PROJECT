import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'driver' | 'commuter';
  };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw createError('Invalid or expired token', 401);
    }

    // Get user profile with role
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log(`Profile not found for user ${user.id}, attempting to auto-create...`);
      
      // Fallback: Try to create the profile if it's missing (sync legacy users)
      const role = user.user_metadata?.role || 'commuter';
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      const { data: newProfile, error: createErrorMsg } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: role,
          is_active: false
        })
        .select('id, email, role')
        .single();

      if (createErrorMsg || !newProfile) {
        console.error('Failed to auto-fix missing profile:', createErrorMsg);
        throw createError('User profile not found', 404);
      }
      
      profile = newProfile;
      console.log(`Profile successfully auto-created for ${user.email}`);
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: ('driver' | 'commuter')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
}
