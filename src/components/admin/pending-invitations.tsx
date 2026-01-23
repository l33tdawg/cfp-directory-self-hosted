'use client';

/**
 * Pending Invitations Component
 * 
 * Displays pending user invitations with ability to revoke or resend.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Mail, 
  Clock, 
  Loader2, 
  Trash2, 
  RefreshCw,
  UserPlus,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  inviter?: {
    name: string | null;
    email: string;
  };
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  ORGANIZER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  REVIEWER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  SPEAKER: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  USER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
};

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeDialog, setRevokeDialog] = useState<{ open: boolean; invitation: Invitation | null }>({
    open: false,
    invitation: null,
  });

  const loadInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users/invite');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
      toast.error('Failed to load pending invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleResend = async (invitation: Invitation) => {
    setResending(invitation.id);
    try {
      const res = await fetch(`/api/admin/users/invite/${invitation.id}`, {
        method: 'POST',
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Invitation resent to ${invitation.email}`);
      } else {
        toast.error(data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResending(null);
    }
  };

  const handleRevoke = async () => {
    const invitation = revokeDialog.invitation;
    if (!invitation) return;

    setRevoking(invitation.id);
    try {
      const res = await fetch(`/api/admin/users/invite/${invitation.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        toast.success(`Invitation for ${invitation.email} revoked`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to revoke invitation');
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      toast.error('Failed to revoke invitation');
    } finally {
      setRevoking(null);
      setRevokeDialog({ open: false, invitation: null });
    }
  };

  const copyInviteLink = async (invitationId: string) => {
    // In a real implementation, you'd fetch the token from the server
    // For now, we'll just copy a placeholder URL
    const inviteUrl = `${window.location.origin}/auth/invite?id=${invitationId}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedId(invitationId);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show the card if there are no pending invitations
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Pending Invitations</CardTitle>
                <CardDescription>
                  {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting to be accepted
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadInvitations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-slate-400" />
                        {invitation.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[invitation.role] || ROLE_COLORS.USER}>
                        {invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {invitation.inviter?.name || invitation.inviter?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResend(invitation)}
                          disabled={resending === invitation.id}
                          title="Resend invitation email"
                        >
                          {resending === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invitation.id)}
                          title="Copy invite link"
                        >
                          {copiedId === invitation.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeDialog({ open: true, invitation })}
                          disabled={revoking === invitation.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Revoke invitation"
                        >
                          {revoking === invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog 
        open={revokeDialog.open} 
        onOpenChange={(open) => setRevokeDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation for{' '}
              <strong>{revokeDialog.invitation?.email}</strong>? 
              They will no longer be able to sign up using this invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={!!revoking}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {revoking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Revoking...
                </>
              ) : (
                'Revoke Invitation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
