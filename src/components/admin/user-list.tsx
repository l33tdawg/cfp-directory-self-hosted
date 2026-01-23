'use client';

/**
 * User List Component
 * 
 * Paginated, searchable, filterable, sortable user list for admin management.
 */

import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
import { UserCard } from './user-card';
import { Search, Filter, UserPlus, Loader2, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import type { UserRole } from '@prisma/client';

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'role';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  emailVerified: Date | null;
  createdAt: Date;
  speakerProfile?: {
    onboardingCompleted: boolean;
  } | null;
  reviewerProfile?: {
    onboardingCompleted: boolean;
  } | null;
  _count?: {
    submissions: number;
    reviews: number;
  };
}

interface UserListProps {
  initialUsers: UserData[];
  currentUserId: string;
  totalCount: number;
}

// Role priority for sorting (higher priority roles first)
const ROLE_PRIORITY: Record<UserRole, number> = {
  ADMIN: 0,
  ORGANIZER: 1,
  REVIEWER: 2,
  SPEAKER: 3,
  USER: 4,
};

export function UserList({ initialUsers, currentUserId, totalCount }: UserListProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false,
    userId: '',
    userName: '',
  });
  
  // Filter and sort users
  const filteredUsers = useMemo(() => {
    // First filter
    const filtered = users.filter(user => {
      const matchesSearch = searchQuery === '' || 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Treat USER and SPEAKER as the same role for filtering
      const matchesRole = roleFilter === 'all' || 
        user.role === roleFilter || 
        (roleFilter === 'SPEAKER' && user.role === 'USER');
      
      return matchesSearch && matchesRole;
    });
    
    // Then sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc': {
          const nameA = (a.name || a.email).toLowerCase();
          const nameB = (b.name || b.email).toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case 'name-desc': {
          const nameA = (a.name || a.email).toLowerCase();
          const nameB = (b.name || b.email).toLowerCase();
          return nameB.localeCompare(nameA);
        }
        case 'role':
          return ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
        default:
          return 0;
      }
    });
  }, [users, searchQuery, roleFilter, sortBy]);
  
  // Handle role change
  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
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
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      toast.success(`User role updated to ${newRole}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  }, [router]);
  
  // Handle delete confirmation request
  const handleDeleteRequest = useCallback((userId: string, userName: string) => {
    setDeleteDialog({ open: true, userId, userName });
  }, []);
  
  // Handle actual delete
  const handleDelete = useCallback(async () => {
    const { userId } = deleteDialog;
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      
      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      
      toast.success('User deleted successfully');
      setDeleteDialog({ open: false, userId: '', userName: '' });
      router.refresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  }, [deleteDialog, router]);

  // Handle resend verification email
  const handleResendVerification = useCallback(async (userId: string, email: string) => {
    try {
      const response = await fetch('/api/admin/users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send verification email');
      }
      
      toast.success('Verification email sent successfully');
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send verification email');
    }
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="ORGANIZER">Organizer</SelectItem>
              <SelectItem value="REVIEWER">Reviewer</SelectItem>
              <SelectItem value="SPEAKER">Speaker</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="role">By Role</SelectItem>
            </SelectContent>
          </Select>
          
          <Button asChild>
            <Link href="/admin/users/invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Results Count */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing {filteredUsers.length} of {totalCount} users
        {roleFilter !== 'all' && ` (filtered by ${roleFilter === 'SPEAKER' ? 'Speaker' : roleFilter})`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
      
      {/* User Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">No users found</p>
          {searchQuery && (
            <Button 
              variant="link" 
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              onRoleChange={handleRoleChange}
              onDelete={handleDeleteRequest}
              onResendVerification={handleResendVerification}
            />
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.userName}</strong>? 
              This action cannot be undone. All associated data (submissions, reviews, profiles) 
              will also be deleted.
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
    </div>
  );
}
