'use client';

/**
 * User Invitation Manager Component
 * 
 * Client wrapper that coordinates InviteUserDialog and PendingInvitations
 * so that the pending invitations list auto-refreshes after sending a new invite.
 * 
 * Uses render props pattern to allow flexible placement of components within
 * the parent layout.
 */

import { useRef, useCallback } from 'react';
import { InviteUserDialog } from './invite-user-dialog';
import { PendingInvitations, PendingInvitationsRef } from './pending-invitations';

interface UserInvitationManagerProps {
  children: (props: {
    InviteButton: React.ReactNode;
    PendingList: React.ReactNode;
  }) => React.ReactNode;
}

export function UserInvitationManager({ children }: UserInvitationManagerProps) {
  const pendingInvitationsRef = useRef<PendingInvitationsRef>(null);
  
  const handleInviteSuccess = useCallback(() => {
    // Refresh the pending invitations list after a new invite is sent
    pendingInvitationsRef.current?.refresh();
  }, []);
  
  return (
    <>
      {children({
        InviteButton: <InviteUserDialog onSuccess={handleInviteSuccess} />,
        PendingList: <PendingInvitations ref={pendingInvitationsRef} />,
      })}
    </>
  );
}
