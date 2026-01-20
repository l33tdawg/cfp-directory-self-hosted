/**
 * API Response Helpers
 * 
 * Standardized API response utilities for consistent error handling.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// ============================================================================
// Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

// ============================================================================
// Success Responses
// ============================================================================

export function successResponse<T>(
  data: T, 
  meta?: ApiResponse['meta'],
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, meta },
    { status }
  );
}

export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return successResponse(data, undefined, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================================================
// Error Responses
// ============================================================================

export function errorResponse(
  message: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: 'Validation failed', errors },
    { status: 400 }
  );
}

export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(
  message: string = 'Permission denied'
): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404);
}

export function conflictResponse(
  message: string
): NextResponse<ApiResponse> {
  return errorResponse(message, 409);
}

export function serverErrorResponse(
  message: string = 'Internal server error'
): NextResponse<ApiResponse> {
  return errorResponse(message, 500);
}

// ============================================================================
// Error Handlers
// ============================================================================

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(err.message);
    });
    return validationErrorResponse(errors);
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field';
        return conflictResponse(`A record with this ${field} already exists`);
      case 'P2003':
        // Foreign key constraint violation
        return errorResponse('Referenced record does not exist', 400);
      case 'P2025':
        // Record not found
        return notFoundResponse();
      default:
        return serverErrorResponse('Database error');
    }
  }

  // Generic errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An unexpected error occurred';
    return serverErrorResponse(message);
  }

  return serverErrorResponse();
}

// ============================================================================
// Pagination Helper
// ============================================================================

export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): NextResponse<ApiResponse<T[]>> {
  return successResponse(data, { total, limit, offset });
}
