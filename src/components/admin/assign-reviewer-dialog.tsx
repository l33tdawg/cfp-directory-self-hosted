'use client';

/**
 * Assign Reviewer Dialog
 * 
 * Modal for assigning reviewers to events.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { UserPlus, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Reviewer {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  reviewerProfile?: {
    fullName: string;
    expertiseAreas: string[];
  } | null;
}

interface AssignReviewerDialogProps {
  eventId: string;
  eventName: string;
  availableReviewers: Reviewer[];
  assignedReviewerIds: string[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AssignReviewerDialog({
  eventId,
  eventName,
  availableReviewers,
  assignedReviewerIds,
  trigger,
  onSuccess,
}: AssignReviewerDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(assignedReviewerIds));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter reviewers
  const filteredReviewers = availableReviewers.filter(reviewer => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      reviewer.name?.toLowerCase().includes(searchLower) ||
      reviewer.email.toLowerCase().includes(searchLower) ||
      reviewer.reviewerProfile?.fullName.toLowerCase().includes(searchLower)
    );
  });
  
  const handleToggle = (reviewerId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(reviewerId)) {
      newSelected.delete(reviewerId);
    } else {
      newSelected.add(reviewerId);
    }
    setSelectedIds(newSelected);
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/reviewers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerIds: Array.from(selectedIds) }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update reviewers');
      }
      
      toast.success('Review team updated successfully');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating reviewers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update reviewers');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const hasChanges = () => {
    const current = new Set(assignedReviewerIds);
    if (current.size !== selectedIds.size) return true;
    for (const id of selectedIds) {
      if (!current.has(id)) return true;
    }
    return false;
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Reviewers
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Reviewers</DialogTitle>
          <DialogDescription>
            Select reviewers for <strong>{eventName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search reviewers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Reviewer List */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {filteredReviewers.length === 0 ? (
              <p className="text-center py-8 text-slate-500">
                {searchQuery ? 'No reviewers found' : 'No reviewers available'}
              </p>
            ) : (
              filteredReviewers.map((reviewer) => {
                const isSelected = selectedIds.has(reviewer.id);
                const wasAssigned = assignedReviewerIds.includes(reviewer.id);
                const initials = reviewer.name
                  ? reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  : reviewer.email[0].toUpperCase();
                
                return (
                  <div
                    key={reviewer.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    onClick={() => handleToggle(reviewer.id)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(reviewer.id)}
                    />
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reviewer.image || undefined} />
                      <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {reviewer.reviewerProfile?.fullName || reviewer.name || reviewer.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{reviewer.email}</p>
                    </div>
                    
                    {wasAssigned && !isSelected && (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        Will remove
                      </Badge>
                    )}
                    {!wasAssigned && isSelected && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        Will add
                      </Badge>
                    )}
                    {wasAssigned && isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Summary */}
        <div className="text-sm text-slate-500 text-center">
          {selectedIds.size} reviewer{selectedIds.size !== 1 ? 's' : ''} selected
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !hasChanges()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
