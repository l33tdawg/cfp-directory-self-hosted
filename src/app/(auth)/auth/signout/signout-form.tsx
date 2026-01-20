'use client';

/**
 * Sign Out Form Component
 */

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function SignOutForm() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: '/' });
  };
  
  return (
    <div className="space-y-3">
      <Button
        onClick={handleSignOut}
        className="w-full"
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign out
      </Button>
      
      <Button asChild variant="outline" className="w-full">
        <Link href="/dashboard">Cancel</Link>
      </Button>
    </div>
  );
}
