import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

/**
 * Middleware to validate required query parameters
 */
export function validateQueryParams(requiredParams: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredParams.filter(param => !req.query[param]);
    
    if (missing.length > 0) {
      throw createError(
        `Missing required query parameters: ${missing.join(', ')}`,
        400
      );
    }
    
    next();
  };
}

/**
 * Middleware to validate required body fields
 */
export function validateBodyFields(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter(field => !(field in req.body));
    
    if (missing.length > 0) {
      throw createError(
        `Missing required fields: ${missing.join(', ')}`,
        400
      );
    }
    
    next();
  };
}

/**
 * Middleware to sanitize string inputs to prevent XSS
 */
export function sanitizeStrings(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
}

/**
 * Middleware to validate UUID format
 */
export function validateUUID(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      throw createError(`Invalid ${paramName} format`, 400);
    }
    
    next();
  };
}
