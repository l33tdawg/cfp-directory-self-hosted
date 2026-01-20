/**
 * OAuth Providers Configuration (Example)
 * 
 * This file demonstrates how to add OAuth providers to your self-hosted
 * CFP Directory instance. Copy the provider configurations you need into
 * the providers array in auth.ts.
 * 
 * To enable an OAuth provider:
 * 1. Create OAuth credentials with the provider
 * 2. Add the environment variables
 * 3. Add the provider to the auth.ts providers array
 */

import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

/**
 * GitHub OAuth Provider
 * 
 * Setup Instructions:
 * 1. Go to https://github.com/settings/developers
 * 2. Click "New OAuth App"
 * 3. Set Homepage URL to your app URL
 * 4. Set Authorization callback URL to: {your-url}/api/auth/callback/github
 * 5. Copy Client ID and Client Secret to your .env
 * 
 * Environment Variables:
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 */
export const githubProvider = GitHub({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  // Profile callback to map GitHub profile to your User model
  profile(profile) {
    return {
      id: profile.id.toString(),
      name: profile.name || profile.login,
      email: profile.email || '',
      image: profile.avatar_url,
      role: 'USER' as const,
    };
  },
});

/**
 * Google OAuth Provider
 * 
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable the Google+ API
 * 4. Go to "Credentials" > "Create Credentials" > "OAuth 2.0 Client IDs"
 * 5. Set Application type to "Web application"
 * 6. Add Authorized redirect URI: {your-url}/api/auth/callback/google
 * 7. Copy Client ID and Client Secret to your .env
 * 
 * Environment Variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 */
export const googleProvider = Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  // Profile callback to map Google profile to your User model
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name || '',
      email: profile.email || '',
      image: profile.picture || '',
      role: 'USER' as const,
    };
  },
});

/**
 * Usage Example:
 * 
 * In your auth.ts file, add the providers you want:
 * 
 * ```typescript
 * import { githubProvider, googleProvider } from './oauth-providers.example';
 * 
 * export const { handlers, auth, signIn, signOut } = NextAuth({
 *   // ... other config
 *   providers: [
 *     Credentials({ ... }),
 *     githubProvider,     // Add GitHub
 *     googleProvider,     // Add Google
 *   ],
 * });
 * ```
 * 
 * Environment Variables to add to .env:
 * 
 * # GitHub OAuth (optional)
 * GITHUB_CLIENT_ID=your-github-client-id
 * GITHUB_CLIENT_SECRET=your-github-client-secret
 * 
 * # Google OAuth (optional)
 * GOOGLE_CLIENT_ID=your-google-client-id
 * GOOGLE_CLIENT_SECRET=your-google-client-secret
 */
