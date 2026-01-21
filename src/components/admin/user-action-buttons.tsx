'use client';

/**
 * User Action Buttons Component
 * 
 * Provides inline role change, edit, and delete buttons for user management.
 * More accessible than a dropdown - all actions visible at once.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Shield, 
  Users, 
  UserCheck, 
  User,
  Trash2,
  Loader2,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@prisma/client';

interface UserActionButtonsProps {
  userId: string;
  currentRole: UserRole;
  userName: string;
}

export function UserActionButtons({ userId, currentRole, userName }: UserActionButtonsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === currentRole) return;
    
    setIsLoading(newRole);
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
      setIsLoading(null);
    }
  };
  
  const handleDelete = async () => {
    setIsLoading('delete');
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
      setIsLoading(null);
      setShowDeleteDialog(false);
    }
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Edit Profile Button */}
            <div className="sm:border-r sm:pr-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Profile</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/users/${userId}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </div>
            
            {/* Role Change Buttons */}
            <div className="flex-1">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Change Role</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={currentRole === 'ADMIN' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRoleChange('ADMIN')}
                  disabled={currentRole === 'ADMIN' || isLoading !== null}
                  className={currentRole === 'ADMIN' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isLoading === 'ADMIN' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Admin
                </Button>
                
                <Button
                  variant={currentRole === 'ORGANIZER' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRoleChange('ORGANIZER')}
                  disabled={currentRole === 'ORGANIZER' || isLoading !== null}
                  className={currentRole === 'ORGANIZER' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {isLoading === 'ORGANIZER' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Organizer
                </Button>
                
                <Button
                  variant={currentRole === 'REVIEWER' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRoleChange('REVIEWER')}
                  disabled={currentRole === 'REVIEWER' || isLoading !== null}
                  className={currentRole === 'REVIEWER' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {isLoading === 'REVIEWER' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  Reviewer
                </Button>
                
                <Button
                  variant={currentRole === 'USER' || currentRole === 'SPEAKER' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRoleChange('USER')}
                  disabled={currentRole === 'USER' || currentRole === 'SPEAKER' || isLoading !== null}
                  className={currentRole === 'USER' || currentRole === 'SPEAKER' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {isLoading === 'USER' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Speaker/User
                </Button>
              </div>
            </div>
            
            {/* Delete Button */}
            <div className="sm:border-l sm:pl-4 pt-4 sm:pt-0">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Danger Zone</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading !== null}
              >
                {isLoading === 'delete' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
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
            <AlertDialogCancel disabled={isLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading !== null}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoading === 'delete' ? (
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
