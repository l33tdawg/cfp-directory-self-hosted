'use client';

/**
 * User Card Component
 * 
 * Displays user information in a card format with quick actions.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  User, 
  Shield, 
  UserCheck, 
  Users,
  Mail,
  Calendar,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { UserRole } from '@prisma/client';

interface UserCardData {
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

interface UserCardProps {
  user: UserCardData;
  onRoleChange?: (userId: string, newRole: UserRole) => void;
  currentUserId: string;
}

const roleConfig: Record<UserRole, { color: string; icon: typeof User }> = {
  ADMIN: { color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', icon: Shield },
  ORGANIZER: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: Users },
  REVIEWER: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: UserCheck },
  SPEAKER: { color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', icon: User },
  USER: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300', icon: User },
};

export function UserCard({ user, onRoleChange, currentUserId }: UserCardProps) {
  const config = roleConfig[user.role];
  const RoleIcon = config.icon;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();
  
  const isCurrentUser = user.id === currentUserId;
  
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
              <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link 
                  href={`/admin/users/${user.id}`}
                  className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {user.name || 'Unnamed User'}
                </Link>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={config.color}>
              <RoleIcon className="h-3 w-3 mr-1" />
              {user.role}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${user.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!isCurrentUser && onRoleChange && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => onRoleChange(user.id, 'ADMIN')}
                      disabled={user.role === 'ADMIN'}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onRoleChange(user.id, 'ORGANIZER')}
                      disabled={user.role === 'ORGANIZER'}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Make Organizer
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onRoleChange(user.id, 'REVIEWER')}
                      disabled={user.role === 'REVIEWER'}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Make Reviewer
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onRoleChange(user.id, 'USER')}
                      disabled={user.role === 'USER'}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Make User
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Stats Row */}
        {user._count && (
          <div className="mt-4 pt-4 border-t flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            {user._count.submissions > 0 && (
              <span>{user._count.submissions} submissions</span>
            )}
            {user._count.reviews > 0 && (
              <span>{user._count.reviews} reviews</span>
            )}
            {user.speakerProfile && (
              <Badge variant={user.speakerProfile.onboardingCompleted ? 'secondary' : 'outline'}>
                {user.speakerProfile.onboardingCompleted ? 'Speaker setup complete' : 'Speaker setup pending'}
              </Badge>
            )}
            {user.reviewerProfile && (
              <Badge variant={user.reviewerProfile.onboardingCompleted ? 'secondary' : 'outline'}>
                {user.reviewerProfile.onboardingCompleted ? 'Reviewer setup complete' : 'Reviewer setup pending'}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
