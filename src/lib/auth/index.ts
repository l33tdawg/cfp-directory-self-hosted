/**
 * Auth Module Exports
 * 
 * Re-exports all authentication utilities for easy importing.
 */

// Main auth configuration
export { auth, signIn, signOut, handlers } from './auth';

// Session helpers
export {
  getSession,
  getApiUser,
  getCurrentUser,
  requireRole,
  requireAdmin,
  isAdmin,
  getCurrentUserId,
} from './get-session';

// Password utilities
export { hashPassword, verifyPassword, hasRole } from './auth';

// Validation schemas
export {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  passwordSchema,
  type SignInInput,
  type SignUpInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from './validation';
