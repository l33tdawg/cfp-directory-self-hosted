'use client';

/**
 * User Actions Component
 * 
 * Provides role change and delete functionality for user management.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  MoreHorizontal, 
  Shield, 
  Users, 
  UserCheck, 
  User,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@prisma/client';

interface UserActionsProps {
  userId: string;
  currentRole: UserRole;
  userName: string;
}

export function UserActions({ userId, currentRole, userName }: UserActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === currentRole) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }
      
      toast.success(`User role updated to ${newRole}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      
      toast.success('User deleted successfully');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MoreHorizontal className="h-4 w-4 mr-2" />
            )}
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => handleRoleChange('ADMIN')}
            disabled={currentRole === 'ADMIN'}
          >
            <Shield className="h-4 w-4 mr-2" />
            Make Admin
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleRoleChange('ORGANIZER')}
            disabled={currentRole === 'ORGANIZER'}
          >
            <Users className="h-4 w-4 mr-2" />
            Make Organizer
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleRoleChange('REVIEWER')}
            disabled={currentRole === 'REVIEWER'}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Make Reviewer
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleRoleChange('USER')}
            disabled={currentRole === 'USER'}
          >
            <User className="h-4 w-4 mr-2" />
            Make User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
              All associated data (submissions, reviews, profiles) will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
