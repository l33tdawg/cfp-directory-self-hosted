/**
 * Auth Validation Tests
 * 
 * Tests for the authentication validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordSchema,
  changePasswordSchema,
} from '@/lib/auth/validation';

describe('Auth Validation Schemas', () => {
  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password1',
        'MySecure123',
        'Test1234',
        'Abcdefgh1',
        'UPPER123lower',
      ];

      validPasswords.forEach((password) => {
        const result = passwordSchema.safeParse(password);
        expect(result.success, `Password "${password}" should be valid`).toBe(true);
      });
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('8 characters');
      }
    });

    it('should reject passwords without uppercase letters', () => {
      const result = passwordSchema.safeParse('password123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('should reject passwords without lowercase letters', () => {
      const result = passwordSchema.safeParse('PASSWORD123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase');
      }
    });

    it('should reject passwords without numbers', () => {
      const result = passwordSchema.safeParse('PasswordABC');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('number');
      }
    });
  });

  describe('signInSchema', () => {
    it('should accept valid sign in data', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = signInSchema.safeParse({
        email: 'invalid-email',
        password: 'anypassword',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const result = signInSchema.safeParse({
        password: 'anypassword',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('signUpSchema', () => {
    it('should accept valid sign up data', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('should accept sign up without optional name', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("don't match");
      }
    });

    it('should reject weak passwords', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = signUpSchema.safeParse({
        email: 'not-an-email',
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        name: 'A',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should accept valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should accept valid reset data', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'some-reset-token',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'some-reset-token',
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid password change data', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject if new password matches current', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'Password123',
        newPassword: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('different');
      }
    });

    it('should reject mismatched new passwords', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword789',
      });
      expect(result.success).toBe(false);
    });
  });
});
