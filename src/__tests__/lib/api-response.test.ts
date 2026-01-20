/**
 * API Response Helper Tests
 */

import { describe, it, expect } from 'vitest';
import {
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  paginatedResponse,
} from '@/lib/api/response';

describe('API Response Helpers', () => {
  describe('successResponse', () => {
    it('should return 200 status with data', async () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);
      
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should handle array data', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = successResponse(data);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should handle null data', async () => {
      const response = successResponse(null);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeNull();
    });
  });

  describe('createdResponse', () => {
    it('should return 201 status with data', async () => {
      const data = { id: '123', name: 'New Item' };
      const response = createdResponse(data);
      
      expect(response.status).toBe(201);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });
  });

  describe('noContentResponse', () => {
    it('should return 204 status with no body', () => {
      const response = noContentResponse();
      
      expect(response.status).toBe(204);
    });
  });

  describe('errorResponse', () => {
    it('should return error with specified status', async () => {
      const response = errorResponse('Something went wrong', 500);
      
      expect(response.status).toBe(500);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Something went wrong');
    });

    it('should default to 400 status', async () => {
      const response = errorResponse('Bad request');
      
      expect(response.status).toBe(400);
    });
  });

  describe('unauthorizedResponse', () => {
    it('should return 401 status', async () => {
      const response = unauthorizedResponse();
      
      expect(response.status).toBe(401);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Authentication');
    });

    it('should use custom message', async () => {
      const response = unauthorizedResponse('Token expired');
      
      const json = await response.json();
      expect(json.error).toBe('Token expired');
    });
  });

  describe('forbiddenResponse', () => {
    it('should return 403 status', async () => {
      const response = forbiddenResponse();
      
      expect(response.status).toBe(403);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Permission');
    });

    it('should use custom message', async () => {
      const response = forbiddenResponse('Admin access required');
      
      const json = await response.json();
      expect(json.error).toBe('Admin access required');
    });
  });

  describe('notFoundResponse', () => {
    it('should return 404 status', async () => {
      const response = notFoundResponse('User');
      
      expect(response.status).toBe(404);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('User');
      expect(json.error).toContain('not found');
    });
  });

  describe('validationErrorResponse', () => {
    it('should return 400 status with errors', async () => {
      const errors = {
        email: ['Invalid email format'],
        password: ['Password too short'],
      };
      
      const response = validationErrorResponse(errors);
      
      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Validation');
      expect(json.errors).toEqual(errors);
    });
  });

  describe('paginatedResponse', () => {
    it('should return paginated data structure', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = paginatedResponse(data, 100, 20, 0);
      
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.meta).toEqual({
        total: 100,
        limit: 20,
        offset: 0,
      });
    });

    it('should include pagination meta', async () => {
      const data = [{ id: '1' }];
      const response = paginatedResponse(data, 50, 10, 20);
      
      const json = await response.json();
      expect(json.meta.total).toBe(50);
      expect(json.meta.limit).toBe(10);
      expect(json.meta.offset).toBe(20);
    });
  });
});
