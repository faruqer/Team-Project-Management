import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  if (err instanceof Error && err.message.includes('Only JPEG')) {
    res.status(400).json({
      error: { message: err.message, code: 'VALIDATION_ERROR' },
    });
    return;
  }

  if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      error: { message: 'File too large (max 2MB)', code: 'VALIDATION_ERROR' },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      error: { message: err.message, code: 'CSRF_ERROR' },
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
