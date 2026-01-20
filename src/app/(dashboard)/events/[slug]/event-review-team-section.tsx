/**
 * Event Review Team Section
 * 
 * Client component for managing event review team.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Plus, Loader2, Users, Trash2, Crown, User } from 'lucide-react';

interface ReviewTeamMember {
  id: string;
  userId: string;
  role: 'LEAD' | 'REVIEWER';
  addedAt: Date;
}

interface UserInfo {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface EventReviewTeamSectionProps {
  eventId: string;
  reviewTeam: ReviewTeamMember[];
  reviewers: UserInfo[];
}

export function EventReviewTeamSection({ 
  eventId, 
  reviewTeam: initialTeam,
  reviewers: initialReviewers,
}: EventReviewTeamSectionProps) {
  const router = useRouter();
  const api = useApi();
  const [team, setTeam] = useState(initialTeam);
  const [reviewers] = useState(new Map(initialReviewers.map(r => [r.id, r])));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    userId: '',
    role: 'REVIEWER' as 'LEAD' | 'REVIEWER',
  });
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<UserInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    
    setIsSearching(true);
    setSearchResult(null);
    
    // Search for user by email using the users API
    const { data, error } = await api.get(`/api/users/search?email=${encodeURIComponent(searchEmail)}`);
    
    setIsSearching(false);
    
    if (error) {
      toast.error('User not found');
      return;
    }
    
    const user = data as UserInfo;
    
    // Check if user is already on the team
    if (team.some(m => m.userId === user.id)) {
      toast.error('User is already on the review team');
      return;
    }
    
    setSearchResult(user);
    setNewMember({ ...newMember, userId: user.id });
  };
  
  const handleAddMember = async () => {
    if (!newMember.userId) {
      toast.error('Please search for a user first');
      return;
    }
    
    const { data, error } = await api.post(`/api/events/${eventId}/review-team`, newMember);
    
    if (error) return;
    
    const addedMember = data as { id: string; userId: string; role: 'LEAD' | 'REVIEWER'; addedAt: Date; user: UserInfo };
    
    setTeam([...team, addedMember]);
    if (addedMember.user) {
      reviewers.set(addedMember.userId, addedMember.user);
    }
    setNewMember({ userId: '', role: 'REVIEWER' });
    setSearchEmail('');
    setSearchResult(null);
    setIsDialogOpen(false);
    toast.success('Reviewer added successfully');
    router.refresh();
  };
  
  const handleRemoveMember = async (userId: string) => {
    const { error } = await api.delete(`/api/events/${eventId}/review-team?userId=${userId}`);
    
    if (error) return;
    
    setTeam(team.filter(m => m.userId !== userId));
    toast.success('Reviewer removed');
    router.refresh();
  };
  
  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Review Team</CardTitle>
          <CardDescription>
            Add reviewers to evaluate submissions
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Reviewer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Reviewer</DialogTitle>
              <DialogDescription>
                Search for a user by email to add to the review team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">User Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="reviewer@example.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </div>
              
              {searchResult && (
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={searchResult.image || undefined} />
                      <AvatarFallback>
                        {getInitials(searchResult.name, searchResult.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{searchResult.name || 'No name'}</p>
                      <p className="text-sm text-slate-500">{searchResult.email}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={newMember.role} 
                  onValueChange={(value: 'LEAD' | 'REVIEWER') => 
                    setNewMember({ ...newMember, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVIEWER">Reviewer</SelectItem>
                    <SelectItem value="LEAD">Lead Reviewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false);
                setSearchEmail('');
                setSearchResult(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddMember} 
                disabled={api.isLoading || !searchResult}
              >
                {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Reviewer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {team.length > 0 ? (
          <div className="space-y-3">
            {team.map((member) => {
              const userInfo = reviewers.get(member.userId);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userInfo?.image || undefined} />
                      <AvatarFallback>
                        {getInitials(userInfo?.name, userInfo?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{userInfo?.name || 'Unknown User'}</p>
                      <p className="text-sm text-slate-500">{userInfo?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'LEAD' ? 'default' : 'secondary'}>
                      {member.role === 'LEAD' ? (
                        <>
                          <Crown className="h-3 w-3 mr-1" />
                          Lead
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Reviewer
                        </>
                      )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-red-500"
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-slate-500">No reviewers yet</p>
            <p className="text-sm text-slate-400">
              Add team members to review submissions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
