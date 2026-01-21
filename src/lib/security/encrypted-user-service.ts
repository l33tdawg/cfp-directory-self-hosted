/**
 * Encrypted User Service
 * 
 * Service layer for User operations with automatic PII encryption.
 * All PII fields are encrypted at rest using AES-256-GCM.
 * 
 * Encrypted fields:
 * - email
 * - name
 */

import { prisma } from '@/lib/db/prisma';
import {
  encryptPiiFields,
  decryptPiiFields,
  USER_PII_FIELDS,
} from './encryption';
import type { User, Prisma } from '@prisma/client';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Check if PII encryption is enabled.
 * Defaults to true in production.
 */
function isEncryptionEnabled(): boolean {
  if (process.env.ENCRYPT_PII_AT_REST === 'false') {
    return false;
  }
  return process.env.NODE_ENV === 'production' || process.env.ENCRYPT_PII_AT_REST === 'true';
}

// =============================================================================
// Type Definitions
// =============================================================================

type UserCreateInput = Prisma.UserCreateInput;
type UserUpdateInput = Prisma.UserUpdateInput;
type UserWhereInput = Prisma.UserWhereInput;
type UserWhereUniqueInput = Prisma.UserWhereUniqueInput;

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a new user with encrypted PII.
 */
export async function createUser(data: UserCreateInput): Promise<User> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, USER_PII_FIELDS)
    : data;

  const user = await prisma.user.create({
    data: dataToStore as UserCreateInput,
  });

  return decryptUser(user);
}

/**
 * Update a user with encrypted PII.
 */
export async function updateUser(
  where: UserWhereUniqueInput,
  data: UserUpdateInput
): Promise<User> {
  const dataToStore = isEncryptionEnabled()
    ? encryptPiiFields(data as Record<string, unknown>, USER_PII_FIELDS)
    : data;

  const user = await prisma.user.update({
    where,
    data: dataToStore as UserUpdateInput,
  });

  return decryptUser(user);
}

/**
 * Find a user by unique field and return decrypted data.
 */
export async function findUserByUnique(
  where: UserWhereUniqueInput,
  include?: Prisma.UserInclude
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where,
    include,
  });

  if (!user) return null;
  return decryptUser(user);
}

/**
 * Find a user by email (handles encrypted email lookup).
 * Note: This requires scanning all users if email is encrypted.
 * For better performance, consider using a hash index.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  // First try direct lookup (unencrypted or same encryption)
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    return decryptUser(user);
  }

  // If encryption is enabled, we need to scan all users
  // This is inefficient but necessary for encrypted email lookup
  // Consider implementing a deterministic hash index for production
  if (isEncryptionEnabled()) {
    const users = await prisma.user.findMany();
    for (const u of users) {
      const decrypted = decryptUser(u);
      if (decrypted.email === email) {
        return decrypted;
      }
    }
  }

  return null;
}

/**
 * Find multiple users with decrypted data.
 */
export async function findUsers(
  where?: UserWhereInput,
  include?: Prisma.UserInclude
): Promise<User[]> {
  const users = await prisma.user.findMany({
    where,
    include,
  });

  return users.map(decryptUser);
}

/**
 * Delete a user.
 */
export async function deleteUser(where: UserWhereUniqueInput): Promise<User> {
  const user = await prisma.user.delete({ where });
  return decryptUser(user);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Decrypt a single user's PII fields.
 */
function decryptUser(user: User): User {
  if (!isEncryptionEnabled()) {
    return user;
  }

  return decryptPiiFields(
    user as unknown as Record<string, unknown>,
    USER_PII_FIELDS
  ) as unknown as User;
}

/**
 * Bulk decrypt an array of users.
 */
export function decryptUsers(users: User[]): User[] {
  if (!isEncryptionEnabled()) {
    return users;
  }

  return users.map(decryptUser);
}

