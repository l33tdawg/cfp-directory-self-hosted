/**
 * NextAuth.js Configuration
 * 
 * This module configures authentication for the self-hosted CFP platform.
 * It uses the credentials provider for email/password authentication
 * and can be extended with OAuth providers.
 */

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import type { UserRole } from '@prisma/client';
import type { Adapter } from 'next-auth/adapters';

// Extend the built-in types for NextAuth v5
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    sessionVersion?: number;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    sessionVersion: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt', // Use JWT for session management
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }
        
        const email = credentials.email as string;
        const password = credentials.password as string;
        
        // SECURITY: Use generic error message to prevent email enumeration
        // and auth method disclosure
        const genericError = 'Invalid email or password';
        
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });
        
        if (!user) {
          // Don't reveal that the email doesn't exist
          throw new Error(genericError);
        }
        
        if (!user.passwordHash) {
          // Don't reveal that this account uses social login
          throw new Error(genericError);
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        
        if (!isValidPassword) {
          throw new Error(genericError);
        }
        
        // Return user object (password is never returned)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    // OAuth providers can be added here
    // See: src/lib/auth/oauth-providers.example.ts
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in - store user data in token
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      
      // On subsequent requests (not initial sign-in), validate session and refresh role
      if (token.id && trigger !== 'signIn') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, sessionVersion: true },
        });
        
        // Invalidate session if user not found or session version changed
        if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
          // Return empty token to force re-authentication
          return {} as typeof token;
        }
        
        // Update role from database to ensure it's always current
        token.role = dbUser.role;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    async signIn({ account }) {
      // For OAuth providers, we need to check if user exists
      // and potentially link accounts
      if (account?.provider !== 'credentials') {
        // Allow OAuth sign in
        return true;
      }
      return true;
    },
  },
  events: {
    async createUser(message) {
      // Log new user creation (only in development to avoid PII in production logs)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] New user created: ${message.user.email}`);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

/**
 * Helper to check if the user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  // ADMIN has access to everything
  if (userRole === 'ADMIN') return true;
  return userRole === requiredRole;
}

/**
 * Helper to hash passwords
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Helper to verify passwords
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
