/**
 * Messages Inbox
 *
 * Centralized Gmail-style inbox showing submission messages.
 * Role-aware: Admin/Organizer see all, Reviewer sees event-scoped,
 * Speaker sees their own submission messages.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { MessagesInboxClient } from './messages-inbox-client';

export const metadata = {
  title: 'Messages Inbox',
  description: 'View submission messages',
};

export default async function MessagesInboxPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <MessagesInboxClient />
    </div>
  );
}
