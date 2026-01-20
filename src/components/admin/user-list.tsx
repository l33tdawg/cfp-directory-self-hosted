'use client';

/**
 * User List Component
 * 
 * Paginated, searchable, filterable user list for admin management.
 */

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCard } from './user-card';
import { Search, Filter, UserPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { UserRole } from '@prisma/client';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
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

export function UserList({ initialUsers, currentUserId, totalCount }: UserListProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });
  
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
        
        <div className="flex gap-2">
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
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
          
          <Button asChild>
            <a href="/admin/users/invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </a>
          </Button>
        </div>
      </div>
      
      {/* Results Count */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing {filteredUsers.length} of {totalCount} users
        {roleFilter !== 'all' && ` (filtered by ${roleFilter})`}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
