/**
 * User Management Section (Client Component)
 * 
 * Manage users and their roles.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Shield, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role: string;
  createdAt: Date;
}

interface UserManagementSectionProps {
  users: User[];
  currentUserId: string;
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500',
  ORGANIZER: 'bg-purple-500',
  REVIEWER: 'bg-blue-500',
  USER: 'bg-slate-500',
};

export function UserManagementSection({ users, currentUserId }: UserManagementSectionProps) {
  const router = useRouter();
  const api = useApi();
  const [pendingChange, setPendingChange] = useState<{
    userId: string;
    newRole: string;
    userName: string;
  } | null>(null);
  
  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };
  
  const handleRoleChange = (userId: string, newRole: string, userName: string) => {
    // Show confirmation for role changes
    setPendingChange({ userId, newRole, userName });
  };
  
  const confirmRoleChange = async () => {
    if (!pendingChange) return;
    
    const { error } = await api.patch(`/api/users/${pendingChange.userId}/role`, {
      role: pendingChange.newRole,
    });
    
    if (error) {
      setPendingChange(null);
      return;
    }
    
    toast.success(`Updated ${pendingChange.userName}'s role to ${pendingChange.newRole}`);
    setPendingChange(null);
    router.refresh();
  };
  
  // Count admins to prevent removing the last one
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  
  return (
    <>
      <div className="space-y-4">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const isLastAdmin = user.role === 'ADMIN' && adminCount === 1;
          
          return (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback>
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name || 'No name'}</p>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-400">
                    Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isCurrentUser || isLastAdmin ? (
                  <Badge className={roleColors[user.role]}>
                    {user.role}
                  </Badge>
                ) : (
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value, user.name || user.email)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="ORGANIZER">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          Organizer
                        </div>
                      </SelectItem>
                      <SelectItem value="REVIEWER">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Reviewer
                        </div>
                      </SelectItem>
                      <SelectItem value="USER">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-500" />
                          User
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingChange} onOpenChange={() => setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {pendingChange?.userName}&apos;s role to{' '}
              <strong>{pendingChange?.newRole}</strong>?
              {pendingChange?.newRole === 'ADMIN' && (
                <span className="block mt-2 text-orange-600">
                  Admins have full access to all settings and data.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} disabled={api.isLoading}>
              {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
