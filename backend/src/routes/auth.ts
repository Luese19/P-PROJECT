import { Router } from 'express';
import { supabaseAdmin, supabase } from '../config/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { SignUpSchema, SignInSchema } from 'shared';

export const authRouter = Router();

// Sign up
authRouter.post('/signup', asyncHandler(async (req, res) => {
  const result = SignUpSchema.safeParse(req.body);
  
  if (!result.success) {
    throw createError(result.error.issues[0].message, 400);
  }

  const { email, password, full_name, role, phone } = result.data;

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for development
  });

  if (authError) {
    throw createError(authError.message, 400);
  }

  // Create user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name,
      role,
      phone,
      is_active: false,
    })
    .select()
    .single();

  if (profileError) {
    // Rollback: delete auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw createError('Failed to create user profile', 500);
  }

  // Sign in to get tokens
  const { data: session, error: sessionError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError) {
    throw createError('Account created but failed to sign in', 500);
  }

  res.status(201).json({
    success: true,
    data: {
      user: profile,
      access_token: session.session?.access_token,
      refresh_token: session.session?.refresh_token,
      expires_at: session.session?.expires_at,
    },
    message: 'Account created successfully',
  });
}));

// Sign in
authRouter.post('/signin', asyncHandler(async (req, res) => {
  const result = SignInSchema.safeParse(req.body);
  
  if (!result.success) {
    throw createError(result.error.issues[0].message, 400);
  }

  const { email, password } = result.data;

  const { data: session, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw createError('Invalid email or password', 401);
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError) {
    throw createError('User profile not found', 404);
  }

  res.json({
    success: true,
    data: {
      user: profile,
      access_token: session.session?.access_token,
      refresh_token: session.session?.refresh_token,
      expires_at: session.session?.expires_at,
    },
  });
}));

// Sign out
authRouter.post('/signout', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    await supabaseAdmin.auth.admin.signOut(token);
  }

  res.json({
    success: true,
    message: 'Signed out successfully',
  });
}));

// Get current user
authRouter.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw createError('Invalid or expired token', 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw createError('User profile not found', 404);
  }

  res.json({
    success: true,
    data: profile,
  });
}));

// Refresh token
authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw createError('Refresh token is required', 400);
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (error) {
    throw createError('Failed to refresh token', 401);
  }

  res.json({
    success: true,
    data: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at,
    },
  });
}));
